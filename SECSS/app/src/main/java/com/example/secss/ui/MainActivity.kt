package com.example.secss.ui

import android.app.AlertDialog
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.Gravity
import android.view.View
import android.view.inputmethod.InputMethodManager
import androidx.activity.result.contract.ActivityResultContracts
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.lifecycle.ViewModelProvider
import com.example.secss.SecssApplication
import com.example.secss.data.repository.AuthSession
import com.example.secss.ui.auth.AuthViewModel
import com.example.secss.ui.auth.LoginState
import com.example.secss.ui.vehicle.VehicleListState
import com.example.secss.ui.vehicle.VehicleOperationState
import com.example.secss.ui.vehicle.VehicleViewModel
import com.example.secss.data.repository.PagedResult
import com.example.secss.ui.common.UiState
import com.example.secss.ui.common.dateTime
import com.example.secss.ui.common.day
import com.example.secss.ui.common.str
import com.example.secss.ui.inputoutput.InputOutputViewModel
import com.example.secss.ui.quota.QuotaViewModel
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

class MainActivity : ComponentActivity() {
    private val senaGreen = Color.rgb(57, 169, 0)
    private val secssNavy = Color.rgb(0, 50, 77)
    private lateinit var authViewModel: AuthViewModel
    private lateinit var vehicleViewModel: VehicleViewModel
    private lateinit var inputOutputViewModel: InputOutputViewModel
    private lateinit var quotaViewModel: QuotaViewModel
    private lateinit var root: LinearLayout
    private var token = ""
    private var role = ""
    private var username = ""
    private var vehicles = JSONArray()
    private var documentField: EditText? = null
    private var passwordField: EditText? = null
    private var loginButton: Button? = null
    private var saveButton: Button? = null
    private var loadingLabel: TextView? = null
    private val selectedImages = mutableMapOf<String, Uri>()
    private var pendingImageField: String? = null
    private var pendingImageLabel: TextView? = null
    private var vehicleScreenVisible = false

    // Pantalla activa de los módulos Entradas/Salidas y Cupos: los observers solo dibujan si coincide.
    private enum class Screen { OTHER, ENTRIES, ENTRY_DETAIL, PICKER, OPERATION, GUEST, QUOTAS, QUOTA_DETAIL }
    private var screen = Screen.OTHER
    private var entriesFilter = ""
    private var currentEntryId = 0
    private var currentQuotaUser = 0
    private var currentQuotaVehicle = 0
    private var operationButton: Button? = null
    private var guestButton: Button? = null
    private val imagePicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) {
            uri -> uri?.let(::handleSelectedImage)
    }

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        window.statusBarColor = secssNavy
        window.navigationBarColor = secssNavy

        val container = (application as SecssApplication).container
        val factory = SecssViewModelFactory(container)
        authViewModel = ViewModelProvider(this, factory)[AuthViewModel::class.java]
        vehicleViewModel = ViewModelProvider(this, factory)[VehicleViewModel::class.java]
        inputOutputViewModel = ViewModelProvider(this, factory)[InputOutputViewModel::class.java]
        quotaViewModel = ViewModelProvider(this, factory)[QuotaViewModel::class.java]

        observeViewModels()
    }

    private fun observeViewModels() {
        authViewModel.session.observe(this) { session ->
            if (session == null) {
                token = ""
                role = ""
                username = ""
                showLogin()
            } else {
                if (loginButton != null) hideKeyboard()
                token = session.token
                role = session.role
                username = session.username
                loginButton = null
                showHome(session)
            }
        }
        authViewModel.loginState.observe(this) { state ->
            when (state) {
                LoginState.Loading -> {
                    loginButton?.isEnabled = false
                    loginButton?.text = "Conectando…"
                }
                is LoginState.Error -> {
                    loginButton?.isEnabled = true
                    loginButton?.text = "Ingresar"
                    toast(state.message)
                    authViewModel.resetLoginState()
                }
                LoginState.Success -> authViewModel.resetLoginState()
                else -> Unit
            }
        }
        vehicleViewModel.listState.observe(this) { state ->
            if (!vehicleScreenVisible) return@observe
            when (state) {
                VehicleListState.Loading -> loadingLabel?.text = "Cargando vehículos…"
                is VehicleListState.Loaded -> {
                    vehicles = state.vehicles
                    renderVehicles()
                }
                is VehicleListState.Error -> {
                    loadingLabel?.text = state.message
                    val retry = button("Reintentar")
                    root.addView(retry)
                    retry.setOnClickListener { loadVehicles() }
                }
                VehicleListState.Idle -> Unit
            }
        }
        vehicleViewModel.operationState.observe(this) { state ->
            when (state) {
                VehicleOperationState.Loading -> saveButton?.isEnabled = false
                is VehicleOperationState.Success -> {
                    toast(state.message)
                    saveButton?.isEnabled = true
                    saveButton = null
                    vehicleViewModel.resetOperationState()
                    loadVehicles()
                }
                is VehicleOperationState.Error -> {
                    toast(state.message)
                    saveButton?.isEnabled = true
                    vehicleViewModel.resetOperationState()
                }
                VehicleOperationState.Idle -> Unit
            }
        }

        inputOutputViewModel.listState.observe(this) { state ->
            if (screen != Screen.ENTRIES) return@observe
            when (state) {
                is UiState.Success -> renderEntries(state.data)
                is UiState.Error -> showLoadError(
                    state.message,
                    { loadEntries(entriesFilter) },
                    "Volver al menú SECSS"
                ) { showHome() }
                else -> Unit
            }
        }
        inputOutputViewModel.detailState.observe(this) { state ->
            if (screen != Screen.ENTRY_DETAIL) return@observe
            when (state) {
                is UiState.Success -> renderEntryDetail(state.data)
                is UiState.Error -> showLoadError(
                    state.message,
                    { showEntryDetail(currentEntryId) },
                    "Volver a entradas y salidas"
                ) { loadEntries(entriesFilter) }
                else -> Unit
            }
        }
        inputOutputViewModel.operationState.observe(this) { state ->
            when (state) {
                is UiState.Success -> {
                    toast(state.data)
                    inputOutputViewModel.resetOperation()
                    loadEntries(entriesFilter)
                }
                is UiState.Error -> {
                    toast(state.message)
                    operationButton?.isEnabled = true
                    inputOutputViewModel.resetOperation()
                }
                else -> Unit
            }
        }
        inputOutputViewModel.guestState.observe(this) { state ->
            when (state) {
                is UiState.Success -> {
                    val result = state.data
                    inputOutputViewModel.resetGuest()
                    val credentials = if (result.email != null) {
                        "\n\nCorreo: ${result.email}\nContraseña temporal: ${result.password.orEmpty()}"
                    } else {
                        ""
                    }
                    AlertDialog.Builder(this)
                        .setTitle("Invitado registrado")
                        .setMessage(result.message + credentials)
                        .setCancelable(false)
                        .setPositiveButton("Entendido") { _, _ -> loadEntries("") }
                        .show()
                }
                is UiState.Error -> {
                    toast(state.message)
                    guestButton?.isEnabled = true
                    inputOutputViewModel.resetGuest()
                }
                else -> Unit
            }
        }
        quotaViewModel.listState.observe(this) { state ->
            if (screen != Screen.PICKER && screen != Screen.QUOTAS) return@observe
            when (state) {
                is UiState.Success ->
                    if (screen == Screen.PICKER) renderQuotaPicker(state.data) else renderQuotaList(state.data)
                is UiState.Error -> {
                    val picker = screen == Screen.PICKER
                    showLoadError(
                        state.message,
                        { if (picker) loadQuotaPicker() else loadQuotas() },
                        if (picker) "Volver a entradas y salidas" else "Volver al menú SECSS"
                    ) { if (picker) loadEntries("") else showHome() }
                }
                else -> Unit
            }
        }
        quotaViewModel.myQuotaState.observe(this) { state ->
            if (screen != Screen.QUOTAS) return@observe
            when (state) {
                is UiState.Success -> renderMyQuota(state.data)
                is UiState.Error -> showLoadError(
                    state.message,
                    { loadQuotas() },
                    "Volver al menú SECSS"
                ) { showHome() }
                else -> Unit
            }
        }
        quotaViewModel.detailState.observe(this) { state ->
            if (screen != Screen.OPERATION && screen != Screen.QUOTA_DETAIL) return@observe
            when (state) {
                is UiState.Success ->
                    if (screen == Screen.OPERATION) renderQuotaOperation(state.data) else renderQuotaDetail(state.data)
                is UiState.Error -> {
                    val operation = screen == Screen.OPERATION
                    showLoadError(
                        state.message,
                        {
                            if (operation) showQuotaOperation(currentQuotaUser, currentQuotaVehicle)
                            else showQuotaDetail(currentQuotaUser, currentQuotaVehicle)
                        },
                        if (operation) "Elegir otro cupo" else "Volver a cupos"
                    ) { if (operation) loadQuotaPicker() else loadQuotas() }
                }
                else -> Unit
            }
        }
        quotaViewModel.operationState.observe(this) { state ->
            when (state) {
                is UiState.Success -> {
                    toast(state.data)
                    quotaViewModel.resetOperation()
                    if (screen == Screen.QUOTA_DETAIL) {
                        showQuotaDetail(currentQuotaUser, currentQuotaVehicle)
                    } else {
                        loadQuotas()
                    }
                }
                is UiState.Error -> {
                    toast(state.message)
                    quotaViewModel.resetOperation()
                }
                else -> Unit
            }
        }
    }

    private fun base(title: String) {
        val scroll = ScrollView(this)
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(18), dp(20), dp(28))
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(Color.WHITE, Color.rgb(241, 255, 244), Color.rgb(201, 245, 208))
            )
        }
        scroll.addView(root)
        setContentView(scroll)
        if (title.isNotEmpty()) {
            val heading = label(title).apply {
                textSize = 25f
                setTypeface(null, Typeface.BOLD)
                setTextColor(secssNavy)
                setPadding(0, 0, 0, dp(18))
            }
            root.addView(heading)
        }
    }

    private fun showLogin() {
        vehicleScreenVisible = false
        screen = Screen.OTHER
        base("")
        val cover = ImageView(this).apply {
            setImageResource(com.example.secss.R.drawable.secss_cover)
            scaleType = ImageView.ScaleType.FIT_CENTER
            contentDescription = "Portada SECSS SENA Parqueadero"
            background = rounded(secssNavy, secssNavy)
            setPadding(dp(8), dp(8), dp(8), dp(8))
        }
        root.addView(cover, LinearLayout.LayoutParams(-1, dp(205)))
        val title = label("Bienvenidos a SECSS").apply {
            textSize = 24f
            setTypeface(null, Typeface.BOLD)
            setTextColor(secssNavy)
            gravity = Gravity.CENTER
            setPadding(0, dp(14), 0, dp(2))
        }
        root.addView(title)
        val intro = label("Servicio de Estacionamiento del Complejo Sur SENA").apply {
            gravity = Gravity.CENTER
            setTextColor(Color.rgb(80, 88, 92))
            setPadding(0, 0, 0, dp(16))
        }
        root.addView(intro)

        val loginCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(16), dp(18), dp(18))
            background = rounded(Color.WHITE, Color.rgb(220, 226, 229))
        }
        root.addView(loginCard, LinearLayout.LayoutParams(-1, -2))
        val loginTitle = label("Iniciar sesión").apply {
            textSize = 20f
            setTypeface(null, Typeface.BOLD)
            setTextColor(secssNavy)
        }
        loginCard.addView(loginTitle)
        documentField = input("Número de documento").apply { inputType = 2 }
        loginCard.addView(documentField)
        passwordField = input("Contraseña").apply { inputType = 129 }
        loginCard.addView(passwordField)
        loginButton = button("Ingresar")
        loginCard.addView(loginButton)
        loginButton?.setOnClickListener {
            val document = documentField?.text?.toString()?.trim().orEmpty()
            val password = passwordField?.text?.toString().orEmpty()
            if (document.isEmpty() || password.isEmpty()) {
                toast("Ingresa tu documento y contraseña.")
                return@setOnClickListener
            }
            authViewModel.login(document, password)
        }
    }

    private fun showHome(session: AuthSession? = null) {
        if (session != null) {
            token = session.token
            role = session.role
            username = session.username
        }
        vehicleScreenVisible = false
        screen = Screen.OTHER
        base("")
        val brand = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(18), dp(18), dp(18))
            background = rounded(secssNavy, secssNavy)
        }
        val brandTitle = label("SECSS").apply {
            textSize = 26f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
        }
        brand.addView(brandTitle)
        brand.addView(
            label("Sistema de Gestión y Control Tecnológico · CEET").apply {
                setTextColor(Color.rgb(230, 240, 244))
            }
        )
        root.addView(brand, LinearLayout.LayoutParams(-1, -2))

        root.addView(
            label("Bienvenida, ${username.ifEmpty { "usuario" }}").apply {
                textSize = 20f
                setTypeface(null, Typeface.BOLD)
                setTextColor(secssNavy)
                setPadding(0, dp(18), 0, dp(4))
            }
        )
        root.addView(
            label("Servicio de Estacionamiento del Complejo Sur SENA").apply {
                setTextColor(Color.rgb(80, 88, 92))
                setPadding(0, 0, 0, dp(18))
            }
        )
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(16), dp(18), dp(16))
            background = rounded(Color.WHITE, Color.rgb(220, 226, 229))
        }
        root.addView(card, LinearLayout.LayoutParams(-1, -2))
        card.addView(label("Vehículos").apply {
            textSize = 20f
            setTypeface(null, Typeface.BOLD)
            setTextColor(secssNavy)
        })
        card.addView(label("Registra y consulta motos y bicicletas asociadas a tu cuenta SECSS."))
        card.addView(button("Abrir módulo Vehículos").apply {
            setOnClickListener { loadVehicles() }
        })
        // Módulos Entradas y salidas / Cupos. El ADMINISTRADOR no tiene acceso a /input_output (lo restringe el backend).
        if (role != "ADMINISTRADOR") {
            homeCard(
                "Entradas y salidas",
                when {
                    isOwnOnly() -> "Consulta tu historial de ingresos y salidas del complejo."
                    role == "CELADOR" -> "Registra entradas, salidas e invitados y consulta el historial."
                    else -> "Consulta los ingresos y salidas del complejo."
                },
                "Abrir módulo Entradas y salidas"
            ) { loadEntries("") }
        }
        homeCard(
            "Cupos",
            when {
                isOwnOnly() -> "Consulta el estado de tu cupo de parqueadero."
                role == "ADMINISTRADOR" -> "Consulta y habilita o deshabilita cupos."
                else -> "Consulta los cupos autorizados."
            },
            "Abrir módulo Cupos"
        ) { loadQuotas() }
        root.addView(button("Cerrar sesión").apply {
            setOnClickListener { authViewModel.logout() }
        })
    }

    private fun loadVehicles() {
        screen = Screen.OTHER
        vehicleScreenVisible = true
        base("Mis vehículos")
        root.addView(label("SECSS · Módulo Vehículos"))
        loadingLabel = label("Cargando vehículos…")
        root.addView(loadingLabel)
        vehicleViewModel.loadVehicles(token)
    }

    private fun renderVehicles() {
        base("Mis vehículos")
        root.addView(label("Consulta, registra y administra tus vehículos."))
        if (role == "APRENDIZ") {
            root.addView(button("＋ Registrar vehículo").apply {
                setOnClickListener { showVehicleForm(null) }
            })
        }
        if (vehicles.length() == 0) {
            root.addView(label("Aún no tienes vehículos registrados.").apply {
                setPadding(0, dp(22), 0, dp(10))
            })
        }
        for (index in 0 until vehicles.length()) {
            val item = vehicles.optJSONObject(index) ?: continue
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(15), dp(14), dp(15), dp(14))
                background = rounded(Color.WHITE, Color.rgb(220, 226, 229))
            }
            val cardParams = LinearLayout.LayoutParams(-1, -2).apply {
                setMargins(0, dp(10), 0, 0)
            }
            root.addView(card, cardParams)

            val type = item.optString("tipo_vehiculo")
            val detail = item.optJSONObject("detalles") ?: JSONObject()
            val identifier = if (type == "MOTO") {
                detail.optString("placa")
            } else {
                detail.optString("numero_marco")
            }
            card.addView(label(
                "${if (type == "MOTO") "Motocicleta" else "Bicicleta"} · " +
                        identifier.ifEmpty { "Sin identificador" }
            ).apply { setTypeface(null, Typeface.BOLD) })
            card.addView(
                label(
                    "Marca: ${item.optString("marca", "—")}     " +
                            "Color: ${item.optString("color", "—")}"
                )
            )
            val specification = if (type == "MOTO") {
                "${detail.optString("cilindraje")} c.c. · Modelo ${detail.optString("modelo")}"
            } else {
                detail.optString("clase_bicicleta")
            }
            card.addView(label("Detalle: $specification"))
            card.addView(
                label(
                    "Cupo: ${
                        if (item.optInt("estado_cupo", 0) == 1) {
                            "Activo"
                        } else {
                            "Pendiente de aprobación"
                        }
                    }"
                )
            )
            card.addView(button(if (role == "APRENDIZ") "Consultar / editar" else "Consultar")
                .apply { setOnClickListener { showVehicleForm(item) } })
            if (role == "APRENDIZ") {
                card.addView(button("Retirar vehículo").apply {
                    setOnClickListener { confirmDelete(item) }
                })
            }
        }
        root.addView(button("Volver al menú SECSS").apply {
            setOnClickListener { showHome() }
        })
    }

    private fun showVehicleForm(existing: JSONObject?) {
        val editing = existing != null
        val canEdit = role == "APRENDIZ"
        selectedImages.clear()
        val details = existing?.optJSONObject("detalles") ?: JSONObject()
        base(if (editing) "Detalle del vehículo" else "Registrar vehículo")

        val kind = Spinner(this)
        val kindAdapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            arrayOf("MOTO", "BICICLETA")
        )
        kind.adapter = kindAdapter
        if (editing) {
            kind.setSelection(if (existing?.optString("tipo_vehiculo") == "BICICLETA") 1 else 0)
        }
        kind.isEnabled = !editing && canEdit
        root.addView(kind)

        val make = input("Marca").apply {
            setText(existing?.optString("marca").orEmpty())
            isEnabled = canEdit
        }
        root.addView(make)
        val color = input("Color").apply {
            setText(existing?.optString("color").orEmpty())
            isEnabled = canEdit
        }
        root.addView(color)
        val plate = input("Placa · ejemplo ABC12G").apply {
            inputType = 4096
            setText(details.optString("placa"))
            isEnabled = canEdit
        }
        root.addView(plate)
        val cylinderCapacity = input("Cilindraje (c.c.)").apply {
            inputType = 2
            setText(details.optString("cilindraje"))
            isEnabled = canEdit
        }
        root.addView(cylinderCapacity)
        val year = input("Modelo (año)").apply {
            inputType = 2
            setText(details.optString("modelo"))
            isEnabled = canEdit
        }
        root.addView(year)
        val frame = input("Número de marco").apply {
            setText(details.optString("numero_marco"))
            isEnabled = canEdit
        }
        root.addView(frame)
        val bikeClass = Spinner(this)
        val classAdapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            arrayOf("Montaña", "Ruta", "Urbana", "Electrica")
        )
        bikeClass.adapter = classAdapter
        if (editing) {
            val selectedClass = classAdapter.getPosition(details.optString("clase_bicicleta"))
            if (selectedClass >= 0) bikeClass.setSelection(selectedClass)
        }
        bikeClass.isEnabled = canEdit
        root.addView(bikeClass)

        val updateFields = {
            val isMotorcycle = kind.selectedItem.toString() == "MOTO"
            plate.visibility = if (isMotorcycle) View.VISIBLE else View.GONE
            cylinderCapacity.visibility = if (isMotorcycle) View.VISIBLE else View.GONE
            year.visibility = if (isMotorcycle) View.VISIBLE else View.GONE
            frame.visibility = if (isMotorcycle) View.GONE else View.VISIBLE
            bikeClass.visibility = if (isMotorcycle) View.GONE else View.VISIBLE
            for (index in 0 until root.childCount) {
                val child = root.getChildAt(index)
                if (child.tag == "moto") {
                    child.visibility = if (isMotorcycle) View.VISIBLE else View.GONE
                }
            }
        }
        kind.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
            override fun onItemSelected(
                parent: AdapterView<*>?,
                view: View?,
                position: Int,
                id: Long
            ) = updateFields()
        }
        updateFields()

        root.addView(label("Soportes documentales (JPG, PNG o WEBP; máximo 5 MB cada uno)").apply {
            setTypeface(null, Typeface.BOLD)
            setPadding(0, dp(18), 0, dp(4))
        })
        val savedImages = existing?.optJSONObject("imagenes") ?: JSONObject()
        addImagePicker(
            "Tarjeta de propiedad",
            "imagen_url_tarjeta_propiedad",
            savedImages.optString("imagen_url_tarjeta_propiedad"),
            canEdit,
            true
        )
        addImagePicker(
            "Identificación / chasis",
            "imagen_url_identificacion_vehiculo",
            savedImages.optString("imagen_url_identificacion_vehiculo"),
            canEdit,
            true
        )
        addImagePicker(
            "Foto del vehículo",
            "imagen_url_vehiculo",
            savedImages.optString("imagen_url_vehiculo"),
            canEdit,
            true
        )
        addImagePicker(
            "SOAT vigente",
            "imagen_url_soat",
            savedImages.optString("imagen_url_soat"),
            canEdit,
            false
        )
        addImagePicker(
            "Tecnomecánica vigente",
            "imagen_url_tecnomecanica_vigente",
            savedImages.optString("imagen_url_tecnomecanica_vigente"),
            canEdit,
            false
        )
        updateFields()

        if (canEdit) {
            saveButton = button(if (editing) "Guardar cambios" else "Registrar")
            root.addView(saveButton)
            saveButton?.setOnClickListener {
                val type = kind.selectedItem.toString()
                val makeValue = make.text.toString().trim()
                val colorValue = color.text.toString().trim()
                if (makeValue.isEmpty() || colorValue.isEmpty()) {
                    toast("Completa marca y color.")
                    return@setOnClickListener
                }

                val payload = JSONObject()
                    .put("tipo_vehiculo", type)
                    .put("marca", makeValue)
                    .put("color", colorValue)
                if (type == "MOTO") {
                    val plateValue = plate.text.toString().trim().uppercase()
                    if (!Regex("[A-Z]{3}\\d{2}[A-Z]").matches(plateValue)) {
                        toast("Revisa la placa (ejemplo ABC12G).")
                        return@setOnClickListener
                    }
                    if (cylinderCapacity.text.isEmpty() || year.text.isEmpty()) {
                        toast("Completa cilindraje y modelo.")
                        return@setOnClickListener
                    }
                    payload.put("placa", plateValue)
                    payload.put("cilindraje", cylinderCapacity.text.toString())
                    payload.put("modelo", year.text.toString())
                } else {
                    val frameValue = frame.text.toString().trim()
                    if (frameValue.length < 5) {
                        toast("El número de marco debe tener al menos 5 caracteres.")
                        return@setOnClickListener
                    }
                    payload.put("numero_marco", frameValue.uppercase())
                    payload.put("clase_bicicleta", bikeClass.selectedItem.toString())
                }

                saveButton?.isEnabled = false
                vehicleViewModel.saveVehicle(
                    id = if (editing) existing?.optInt("id") else null,
                    payload = payload,
                    images = selectedImages.toMap()
                )
            }
        }
        root.addView(button("Volver a mis vehículos").apply {
            setOnClickListener { loadVehicles() }
        })
    }

    private fun addImagePicker(
        title: String,
        key: String,
        previous: String,
        canEdit: Boolean,
        common: Boolean
    ) {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, dp(4), 0, dp(5))
            tag = if (common) "common" else "moto"
        }
        row.addView(label(title).apply { textSize = 14f })
        val status = label(
            if (previous.isEmpty()) "Sin archivo seleccionado" else "Soporte ya registrado"
        ).apply { textSize = 12f }
        row.addView(status)
        if (canEdit) {
            row.addView(button("Seleccionar imagen").apply {
                textSize = 13f
                setOnClickListener {
                    pendingImageField = key
                    pendingImageLabel = status
                    imagePicker.launch(arrayOf("image/*"))
                }
            })
        }
        root.addView(row)
    }

    private fun handleSelectedImage(uri: Uri) {
        val mimeType = contentResolver.getType(uri)
        if (mimeType !in setOf("image/jpeg", "image/png", "image/webp")) {
            toast("Selecciona una imagen JPG, PNG o WEBP.")
            return
        }
        val field = pendingImageField ?: return
        selectedImages[field] = uri
        pendingImageLabel?.text = "Imagen seleccionada: ${displayName(uri)}"
    }

    private fun displayName(uri: Uri): String {
        contentResolver.query(uri, null, null, null, null).use { cursor ->
            if (cursor != null && cursor.moveToFirst()) {
                val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (index >= 0) return cursor.getString(index)
            }
        }
        return "archivo"
    }

    private fun confirmDelete(item: JSONObject) {
        AlertDialog.Builder(this)
            .setTitle("Retirar vehículo")
            .setMessage("¿Quieres retirar este vehículo? El cupo quedará pendiente de aprobación.")
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Retirar") { _, _ ->
                vehicleViewModel.deleteVehicle(item.optInt("id"))
            }
            .show()
    }

    // ===================== Utilidades de UI de los módulos nuevos =====================
    private fun isOwnOnly() = role == "APRENDIZ" || role == "INVITADO"

    private fun stateColor(active: Boolean) =
        if (active) Color.rgb(46, 133, 0) else Color.rgb(176, 32, 32)

    private fun enterScreen(target: Screen) {
        screen = target
        vehicleScreenVisible = false
    }

    private fun newCard(parent: LinearLayout = root): LinearLayout {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(15), dp(14), dp(15), dp(14))
            background = rounded(Color.WHITE, Color.rgb(220, 226, 229))
        }
        parent.addView(card, LinearLayout.LayoutParams(-1, -2).apply { setMargins(0, dp(10), 0, 0) })
        return card
    }

    private fun LinearLayout.line(name: String, value: String) {
        addView(label("$name: $value").apply {
            textSize = 14f
            setPadding(0, dp(2), 0, dp(2))
        })
    }

    private fun LinearLayout.sectionTitle(text: String) {
        addView(label(text).apply {
            setTypeface(null, Typeface.BOLD)
            setTextColor(secssNavy)
        })
    }

    private fun backButton(text: String, action: () -> Unit) {
        root.addView(button(text).apply { setOnClickListener { action() } })
    }

    private fun homeCard(title: String, description: String, action: String, onClick: () -> Unit) {
        val card = newCard()
        card.addView(label(title).apply {
            textSize = 20f
            setTypeface(null, Typeface.BOLD)
            setTextColor(secssNavy)
        })
        card.addView(label(description))
        card.addView(button(action).apply { setOnClickListener { onClick() } })
    }

    private fun showLoading(title: String, message: String) {
        base(title)
        val loading = label(message)
        loadingLabel = loading
        root.addView(loading)
    }

    private fun showLoadError(message: String, retry: () -> Unit, backText: String, back: () -> Unit) {
        loadingLabel?.text = message
        root.addView(button("Reintentar").apply { setOnClickListener { retry() } })
        backButton(backText, back)
    }

    private fun spinnerOf(vararg options: String) = Spinner(this).apply {
        adapter = ArrayAdapter(
            this@MainActivity,
            android.R.layout.simple_spinner_dropdown_item,
            arrayOf(*options)
        )
    }

    private fun EditText.onTextChanged(action: () -> Unit) {
        addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = action()
            override fun afterTextChanged(s: Editable?) = Unit
        })
    }

    private fun fillVehicleLines(card: LinearLayout, data: JSONObject) {
        val type = data.str("tipo_vehiculo")
        card.line("Vehículo", "$type · ${data.str("identificador_vehiculo")}")
        card.line("Marca / color", "${data.str("marca")} / ${data.str("color")}")
        if (type == "MOTO") {
            card.line("Moto", "${data.str("cilindraje")} c.c. · Modelo ${data.str("modelo")}")
        } else if (type == "BICICLETA") {
            card.line("Bicicleta", "Clase ${data.str("clase_bicicleta")} · Marco ${data.str("numero_marco")}")
        }
    }

    // ===================== Módulo Entradas y salidas (input_output) =====================
    // APRENDIZ/INVITADO ven solo lo propio. JEFE y CELADOR ven todo. Solo el CELADOR registra
    // entradas, salidas e invitados (el backend lo valida con allowRoles).
    private fun loadEntries(estado: String) {
        enterScreen(Screen.ENTRIES)
        entriesFilter = estado
        showLoading("Entradas y salidas", "Cargando registros…")
        inputOutputViewModel.loadEntries(token, isOwnOnly(), estado)
    }

    private fun renderEntries(result: PagedResult) {
        val rows = result.rows
        base("Entradas y salidas")
        root.addView(
            label(
                if (isOwnOnly()) "Tu historial de ingresos y salidas."
                else "Registros del complejo · ${result.total} en total."
            )
        )
        if (role == "CELADOR") {
            root.addView(button("＋ Registrar entrada / salida").apply {
                setOnClickListener { loadQuotaPicker() }
            })
            root.addView(button("＋ Registrar invitado e ingreso").apply {
                setOnClickListener { showGuestForm() }
            })
        }
        val filters = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        root.addView(filters, LinearLayout.LayoutParams(-1, -2))
        listOf("Todos" to "", "Dentro" to "DENTRO", "Fuera" to "FUERA").forEach { (name, value) ->
            filters.addView(
                button((if (entriesFilter == value) "● " else "") + name).apply {
                    textSize = 13f
                    setOnClickListener { loadEntries(value) }
                },
                LinearLayout.LayoutParams(0, -2, 1f)
            )
        }
        if (rows.length() == 0) {
            root.addView(label("No hay registros para mostrar.").apply { setPadding(0, dp(22), 0, dp(10)) })
        } else if (result.total > rows.length()) {
            root.addView(label("Mostrando los ${rows.length()} más recientes."))
        }
        for (index in 0 until rows.length()) {
            val item = rows.optJSONObject(index) ?: continue
            val inside = item.isNull("fecha_hora_salida")
            val entryId = item.optInt("id")
            val card = newCard()
            card.addView(label("${item.str("persona")} · ${if (inside) "DENTRO" else "FUERA"}").apply {
                setTypeface(null, Typeface.BOLD)
                setTextColor(if (inside) stateColor(true) else Color.rgb(90, 98, 104))
            })
            card.line("Documento", item.str("documento"))
            card.line("Vehículo", "${item.str("tipo_vehiculo")} · ${item.str("identificador_vehiculo")}")
            card.line("Ingreso", item.dateTime("fecha_hora_ingreso"))
            card.line("Salida", if (inside) "Aún dentro" else item.dateTime("fecha_hora_salida"))
            if (!isOwnOnly()) card.line("Celador (ingreso)", item.str("celador_ingreso"))
            card.addView(button("Ver detalle").apply { setOnClickListener { showEntryDetail(entryId) } })
            if (role == "CELADOR" && inside) {
                card.addView(button("Registrar salida").apply { setOnClickListener { confirmExit(entryId) } })
            }
        }
        backButton("Volver al menú SECSS") { showHome() }
    }

    private fun showEntryDetail(entryId: Int) {
        enterScreen(Screen.ENTRY_DETAIL)
        currentEntryId = entryId
        showLoading("Detalle del registro", "Cargando detalle…")
        inputOutputViewModel.loadDetail(token, entryId)
    }

    private fun renderEntryDetail(data: JSONObject) {
        base("Detalle del registro")
        val person = newCard()
        person.sectionTitle("Persona")
        val fullName = listOf("primer_nombre", "segundo_nombre", "primer_apellido", "segundo_apellido")
            .map { data.str(it, "") }
            .filter { it.isNotEmpty() }
            .joinToString(" ")
        person.line("Nombre", fullName.ifEmpty { "—" })
        person.line("Documento", "${data.str("tipo_documento", "")} ${data.str("documento_persona")}".trim())
        person.line("Celular", data.str("n_celular"))
        person.line("Correo", data.str("correo"))
        if (!data.isNull("ficha")) {
            person.line("Ficha", data.str("ficha"))
            person.line("Centro", data.str("nombre_centro"))
            person.line("Vinculación", "${data.day("fecha_vinculacion")} → ${data.day("fecha_terminacion")}")
        }
        val vehicle = newCard()
        vehicle.sectionTitle("Vehículo")
        vehicle.line("Tipo", data.str("tipo_vehiculo"))
        vehicle.line("Identificador", data.str("identificador_vehiculo"))
        vehicle.line("Marca / color", "${data.str("marca")} / ${data.str("color")}")
        val movement = newCard()
        movement.sectionTitle("Movimiento")
        movement.line("Ingreso", "${data.dateTime("fecha_hora_ingreso")} · ${data.str("celador_ingreso")}")
        movement.line(
            "Salida",
            if (data.isNull("fecha_hora_salida")) "Aún dentro"
            else "${data.dateTime("fecha_hora_salida")} · ${data.str("celador_salida")}"
        )
        backButton("Volver a entradas y salidas") { loadEntries(entriesFilter) }
    }

    private fun confirmExit(entryId: Int) {
        AlertDialog.Builder(this)
            .setTitle("Registrar salida")
            .setMessage("¿Confirmas la salida de este vehículo?")
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Registrar") { _, _ -> inputOutputViewModel.registerExit(token, entryId) }
            .show()
    }

    // Paso 1 (celador): elegir el cupo (usuario + vehículo) sobre el que se registra la operación.
    private fun loadQuotaPicker() {
        enterScreen(Screen.PICKER)
        showLoading("Registrar entrada / salida", "Cargando cupos…")
        quotaViewModel.loadQuotas(token)
    }

    private fun renderQuotaPicker(result: PagedResult) {
        val rows = result.rows
        base("Registrar entrada / salida")
        root.addView(label("Busca por nombre, documento o placa/marco y selecciona el cupo."))
        val search = input("Buscar…")
        root.addView(search)
        val list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(list, LinearLayout.LayoutParams(-1, -2))
        val fill: () -> Unit = {
            list.removeAllViews()
            val query = search.text.toString().trim().lowercase()
            var shown = 0
            for (index in 0 until rows.length()) {
                val row = rows.optJSONObject(index) ?: continue
                val haystack = listOf(
                    row.str("usuario", ""),
                    row.str("numero_documento", ""),
                    row.str("tipo_vehiculo", ""),
                    row.str("identificador_vehiculo", "")
                ).joinToString(" ").lowercase()
                if (query.isNotEmpty() && !haystack.contains(query)) continue
                shown++
                val userId = row.optInt("id_usuario")
                val vehicleId = row.optInt("id_vehiculo")
                val inactive = if (row.optInt("estado") == 1) "" else "  (cupo inactivo)"
                list.addView(
                    button(
                        "${row.str("usuario", "Sin nombre")} · ${row.str("tipo_vehiculo", "")} · " +
                                row.str("identificador_vehiculo", "") + inactive
                    ).apply { setOnClickListener { showQuotaOperation(userId, vehicleId) } }
                )
            }
            if (shown == 0) list.addView(label("No hay coincidencias."))
        }
        search.onTextChanged(fill)
        fill()
        backButton("Volver a entradas y salidas") { loadEntries("") }
    }

    // Paso 2: se valida el cupo y se ofrece la operación que corresponde (entrada si está fuera, salida si está dentro).
    private fun showQuotaOperation(userId: Int, vehicleId: Int) {
        enterScreen(Screen.OPERATION)
        currentQuotaUser = userId
        currentQuotaVehicle = vehicleId
        showLoading("Registrar operación", "Validando autorización…")
        quotaViewModel.loadDetail(token, userId, vehicleId)
    }

    private fun renderQuotaOperation(data: JSONObject) {
        base("Registrar operación")
        val card = newCard()
        fillQuotaCard(card, data)
        val active = data.optInt("estado") == 1
        val openId = if (data.isNull("idEntradaAbierta")) 0 else data.optInt("idEntradaAbierta")
        if (openId > 0) {
            card.addView(label("El vehículo se encuentra DENTRO del complejo."))
            card.addView(button("Registrar salida").apply { setOnClickListener { confirmExit(openId) } })
        } else if (active) {
            card.addView(label("El vehículo se encuentra FUERA del complejo."))
            card.addView(button("Registrar entrada").apply {
                setOnClickListener {
                    isEnabled = false
                    operationButton = this
                    inputOutputViewModel.registerEntry(token, currentQuotaUser, currentQuotaVehicle)
                }
            })
        } else {
            card.addView(label("El cupo está INACTIVO: no se puede registrar la entrada.").apply {
                setTextColor(stateColor(false))
                setTypeface(null, Typeface.BOLD)
            })
        }
        backButton("Elegir otro cupo") { loadQuotaPicker() }
    }

    // Alta de INVITADO nuevo + vehículo + entrada (POST /input_output/invitado). Las imágenes son opcionales.
    private fun showGuestForm() {
        enterScreen(Screen.GUEST)
        selectedImages.clear()
        base("Registrar invitado e ingreso")
        root.addView(label("La cuenta del invitado vence automáticamente a los seis meses."))
        val docType = spinnerOf("CC", "CE", "PPT")
        root.addView(docType)
        val document = input("Número de documento").apply { inputType = InputType.TYPE_CLASS_NUMBER }
        root.addView(document)
        val firstName = input("Primer nombre")
        root.addView(firstName)
        val secondName = input("Segundo nombre (opcional)")
        root.addView(secondName)
        val firstSurname = input("Primer apellido")
        root.addView(firstSurname)
        val secondSurname = input("Segundo apellido (opcional)")
        root.addView(secondSurname)
        val phone = input("Celular").apply { inputType = InputType.TYPE_CLASS_PHONE }
        root.addView(phone)
        val email = input("Correo electrónico").apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
        }
        root.addView(email)
        val kind = spinnerOf("MOTO", "BICICLETA")
        root.addView(kind)
        val make = input("Marca")
        root.addView(make)
        val color = input("Color")
        root.addView(color)
        val plate = input("Placa · ejemplo ABC12G").apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS
        }
        root.addView(plate)
        val cylinderCapacity = input("Cilindraje (50 a 2000 c.c.)").apply { inputType = InputType.TYPE_CLASS_NUMBER }
        root.addView(cylinderCapacity)
        val year = input("Modelo (año)").apply { inputType = InputType.TYPE_CLASS_NUMBER }
        root.addView(year)
        val frame = input("Número de marco (mínimo 5 caracteres)")
        root.addView(frame)
        val bikeClass = spinnerOf("Montaña", "Ruta", "Urbana", "Electrica")
        root.addView(bikeClass)

        val updateFields: () -> Unit = {
            val isMotorcycle = kind.selectedItem.toString() == "MOTO"
            plate.visibility = if (isMotorcycle) View.VISIBLE else View.GONE
            cylinderCapacity.visibility = if (isMotorcycle) View.VISIBLE else View.GONE
            year.visibility = if (isMotorcycle) View.VISIBLE else View.GONE
            frame.visibility = if (isMotorcycle) View.GONE else View.VISIBLE
            bikeClass.visibility = if (isMotorcycle) View.GONE else View.VISIBLE
        }
        kind.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
            override fun onItemSelected(
                parent: AdapterView<*>?,
                view: View?,
                position: Int,
                id: Long
            ) = updateFields()
        }
        updateFields()

        root.addView(label("Soportes (opcionales · JPG, PNG o WEBP; máximo 5 MB). Si no se adjuntan se usa una imagen genérica.").apply {
            setTypeface(null, Typeface.BOLD)
            setPadding(0, dp(18), 0, dp(4))
        })
        addImagePicker("Tarjeta de propiedad", "imagen_url_tarjeta_propiedad", "", true, true)
        addImagePicker("Identificación / chasis", "imagen_url_identificacion_vehiculo", "", true, true)
        addImagePicker("Foto del vehículo", "imagen_url_vehiculo", "", true, true)

        val save = button("Registrar invitado e ingreso")
        root.addView(save)
        save.setOnClickListener {
            val type = kind.selectedItem.toString()
            val required = listOf(
                document.text.toString().trim(),
                firstName.text.toString().trim(),
                firstSurname.text.toString().trim(),
                phone.text.toString().trim(),
                email.text.toString().trim(),
                make.text.toString().trim(),
                color.text.toString().trim()
            )
            if (required.any { it.isEmpty() }) {
                toast("Completa los datos obligatorios de la persona y del vehículo.")
                return@setOnClickListener
            }
            if (!Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$").matches(required[4])) {
                toast("El correo no tiene un formato válido.")
                return@setOnClickListener
            }
            val payload = JSONObject()
                .put("tipo_documento", docType.selectedItem.toString())
                .put("numero_documento", required[0])
                .put("primer_nombre", required[1])
                .put("segundo_nombre", secondName.text.toString().trim())
                .put("primer_apellido", required[2])
                .put("segundo_apellido", secondSurname.text.toString().trim())
                .put("n_celular", required[3])
                .put("correo", required[4])
                .put("tipo_vehiculo", type)
                .put("marca", required[5])
                .put("color", required[6])
            if (type == "MOTO") {
                val plateValue = plate.text.toString().trim().uppercase()
                if (!Regex("[A-Z]{3}\\d{2}[A-Z0-9]").matches(plateValue)) {
                    toast("Revisa la placa (ejemplo ABC12G).")
                    return@setOnClickListener
                }
                val displacement = cylinderCapacity.text.toString().trim().toIntOrNull()
                val model = year.text.toString().trim().toIntOrNull()
                if (displacement == null || model == null) {
                    toast("Completa cilindraje y modelo con números.")
                    return@setOnClickListener
                }
                if (displacement < 50 || displacement > 2000) {
                    toast("El cilindraje debe estar entre 50 y 2000.")
                    return@setOnClickListener
                }
                val maxYear = Calendar.getInstance().get(Calendar.YEAR) + 1
                if (model < 1970 || model > maxYear) {
                    toast("El modelo debe estar entre 1970 y $maxYear.")
                    return@setOnClickListener
                }
                payload.put("placa", plateValue)
                payload.put("cilindraje", displacement.toString())
                payload.put("modelo", model.toString())
            } else {
                val frameValue = frame.text.toString().trim()
                if (frameValue.length < 5) {
                    toast("El número de marco debe tener al menos 5 caracteres.")
                    return@setOnClickListener
                }
                payload.put("numero_marco", frameValue.uppercase())
                payload.put("clase_bicicleta", bikeClass.selectedItem.toString())
            }
            save.isEnabled = false
            guestButton = save
            inputOutputViewModel.registerGuest(token, payload, selectedImages.toMap())
        }
        backButton("Volver a entradas y salidas") { loadEntries("") }
    }

    // ===================== Módulo Cupos (quota) =====================
    // ADMINISTRADOR/JEFE/CELADOR listan todos los cupos. APRENDIZ/INVITADO ven el propio.
    // Solo el ADMINISTRADOR habilita/deshabilita; al habilitar, el backend deshabilita los demás
    // cupos activos del mismo usuario (un solo cupo activo por usuario).
    private fun loadQuotas() {
        enterScreen(Screen.QUOTAS)
        showLoading("Cupos", "Cargando cupos…")
        if (isOwnOnly()) quotaViewModel.loadMyQuota(token) else quotaViewModel.loadQuotas(token)
    }

    private fun renderMyQuota(response: JSONObject) {
        base("Mi cupo")
        val vehicle = response.optJSONObject("vehiculo")
        if (vehicle == null) {
            root.addView(
                label("Aún no tienes un cupo asignado. Registra un vehículo para solicitarlo.")
                    .apply { setPadding(0, dp(22), 0, dp(10)) }
            )
        } else {
            val active = vehicle.optInt("estado_cupo") == 1
            val card = newCard()
            card.sectionTitle("Autorización de cupo")
            card.addView(label("Estado: ${if (active) "ACTIVO" else "PENDIENTE / INACTIVO"}").apply {
                setTypeface(null, Typeface.BOLD)
                setTextColor(stateColor(active))
            })
            fillVehicleLines(card, vehicle)
            card.line(
                "En el parqueadero",
                if (response.optBoolean("vehiculoEnParqueadero")) "Sí, dentro del complejo"
                else "No, fuera del complejo"
            )
        }
        root.addView(button("Actualizar").apply { setOnClickListener { loadQuotas() } })
        backButton("Volver al menú SECSS") { showHome() }
    }

    private fun renderQuotaList(result: PagedResult) {
        val rows = result.rows
        val isAdmin = role == "ADMINISTRADOR"
        base("Cupos")
        root.addView(
            label(
                (if (isAdmin) "Consulta y habilita o deshabilita cupos" else "Consulta de cupos") +
                        " · ${result.total} en total."
            )
        )
        val search = input("Buscar por nombre, documento o placa/marco…")
        root.addView(search)
        val list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(list, LinearLayout.LayoutParams(-1, -2))
        val fill: () -> Unit = {
            list.removeAllViews()
            val query = search.text.toString().trim().lowercase()
            var shown = 0
            for (index in 0 until rows.length()) {
                val row = rows.optJSONObject(index) ?: continue
                val haystack = listOf(
                    row.str("usuario", ""),
                    row.str("numero_documento", ""),
                    row.str("tipo_vehiculo", ""),
                    row.str("identificador_vehiculo", "")
                ).joinToString(" ").lowercase()
                if (query.isNotEmpty() && !haystack.contains(query)) continue
                shown++
                val userId = row.optInt("id_usuario")
                val vehicleId = row.optInt("id_vehiculo")
                val active = row.optInt("estado") == 1
                val card = newCard(list)
                card.addView(label("${row.str("usuario", "Sin nombre")} · ${if (active) "ACTIVO" else "INACTIVO"}").apply {
                    setTypeface(null, Typeface.BOLD)
                    setTextColor(stateColor(active))
                })
                card.line("Documento", row.str("numero_documento"))
                card.line("Vehículo", "${row.str("tipo_vehiculo")} · ${row.str("identificador_vehiculo")}")
                card.addView(button("Ver detalle").apply {
                    setOnClickListener { showQuotaDetail(userId, vehicleId) }
                })
                if (isAdmin) {
                    card.addView(button(if (active) "Deshabilitar cupo" else "Habilitar cupo").apply {
                        setOnClickListener { confirmQuotaToggle(userId, vehicleId, !active) }
                    })
                }
            }
            if (shown == 0) list.addView(label("No hay coincidencias."))
        }
        search.onTextChanged(fill)
        fill()
        if (result.total > rows.length()) {
            root.addView(label("Se muestran los primeros ${rows.length()} cupos; usa el buscador para acotar."))
        }
        backButton("Volver al menú SECSS") { showHome() }
    }

    private fun fillQuotaCard(card: LinearLayout, data: JSONObject) {
        val active = data.optInt("estado") == 1
        card.sectionTitle("Autorización de cupo")
        card.addView(label("Estado: ${if (active) "ACTIVO" else "INACTIVO"}").apply {
            setTypeface(null, Typeface.BOLD)
            setTextColor(stateColor(active))
        })
        card.line("Usuario", data.str("usuario"))
        card.line("Documento", data.str("numero_documento"))
        if (!data.isNull("ficha")) {
            card.line("Ficha", data.str("ficha"))
            card.line("Centro", data.str("nombre_centro"))
            card.line("Vinculación", "${data.day("fecha_vinculacion")} → ${data.day("fecha_terminacion")}")
        }
        fillVehicleLines(card, data)
        card.line("Autorizó / auditó", data.str("administrador_auditor"))
    }

    private fun showQuotaDetail(userId: Int, vehicleId: Int) {
        enterScreen(Screen.QUOTA_DETAIL)
        currentQuotaUser = userId
        currentQuotaVehicle = vehicleId
        showLoading("Detalle del cupo", "Cargando detalle…")
        quotaViewModel.loadDetail(token, userId, vehicleId)
    }

    private fun renderQuotaDetail(data: JSONObject) {
        base("Detalle del cupo")
        val card = newCard()
        fillQuotaCard(card, data)
        card.line(
            "En el parqueadero",
            if (data.isNull("idEntradaAbierta")) "No, fuera del complejo" else "Sí, dentro del complejo"
        )
        if (role == "ADMINISTRADOR") {
            val active = data.optInt("estado") == 1
            card.addView(button(if (active) "Deshabilitar cupo" else "Habilitar cupo").apply {
                setOnClickListener { confirmQuotaToggle(currentQuotaUser, currentQuotaVehicle, !active) }
            })
        }
        backButton("Volver a cupos") { loadQuotas() }
    }

    private fun confirmQuotaToggle(userId: Int, vehicleId: Int, enable: Boolean) {
        AlertDialog.Builder(this)
            .setTitle(if (enable) "Habilitar cupo" else "Deshabilitar cupo")
            .setMessage(
                if (enable) "Al habilitar este cupo se deshabilitarán los demás cupos activos del usuario."
                else "¿Seguro que quieres deshabilitar este cupo?"
            )
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Confirmar") { _, _ ->
                quotaViewModel.updateState(token, userId, vehicleId, enable)
            }
            .show()
    }

    private fun label(text: String) = TextView(this).apply {
        this.text = text
        textSize = 15f
        setTextColor(Color.rgb(33, 37, 41))
        setPadding(0, dp(6), 0, dp(6))
    }

    private fun input(hintText: String) = EditText(this).apply {
        setSingleLine(true)
        textSize = 16f
        hint = hintText
        setTextColor(Color.rgb(33, 37, 41))
        setPadding(dp(12), dp(8), dp(12), dp(8))
        layoutParams = LinearLayout.LayoutParams(-1, -2).apply {
            setMargins(0, dp(5), 0, dp(5))
        }
    }

    private fun button(text: String) = Button(this).apply {
        this.text = text
        isAllCaps = false
        setTextColor(Color.WHITE)
        backgroundTintList = ColorStateList.valueOf(senaGreen)
        layoutParams = LinearLayout.LayoutParams(-1, -2).apply {
            setMargins(0, dp(8), 0, dp(4))
        }
    }

    private fun rounded(color: Int, stroke: Int) = GradientDrawable().apply {
        setColor(color)
        cornerRadius = dp(16).toFloat()
        setStroke(dp(1), stroke)
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density + 0.5f).toInt()

    private fun toast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }

    private fun hideKeyboard() {
        val manager = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        manager.hideSoftInputFromWindow(root.windowToken, 0)
    }

}
