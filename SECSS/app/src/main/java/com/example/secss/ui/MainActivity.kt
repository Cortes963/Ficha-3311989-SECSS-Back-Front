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
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : ComponentActivity() {
    private val senaGreen = Color.rgb(57, 169, 0)
    private val secssNavy = Color.rgb(0, 50, 77)
    private lateinit var authViewModel: AuthViewModel
    private lateinit var vehicleViewModel: VehicleViewModel
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
        root.addView(button("Cerrar sesión").apply {
            setOnClickListener { authViewModel.logout() }
        })
    }

    private fun loadVehicles() {
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
