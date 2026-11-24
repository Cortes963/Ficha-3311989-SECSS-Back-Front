package com.example.secss.ui

import android.app.AlertDialog
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.ViewModelProvider
import com.example.secss.SecssApplication
import com.example.secss.data.repository.PagedResult
import com.example.secss.ui.common.UiState
import com.example.secss.ui.common.MotorcyclePlate
import com.example.secss.ui.common.dateTime
import com.example.secss.ui.common.day
import com.example.secss.ui.common.str
import com.example.secss.ui.inputoutput.InputOutputViewModel
import org.json.JSONObject
import java.util.Calendar

class EntriesActivity : ComponentActivity() {
    private val secssNavy = Color.rgb(0, 50, 77)
    private lateinit var inputOutputViewModel: InputOutputViewModel
    private lateinit var root: LinearLayout
    private var token = ""
    private var role = ""
    private var loadingLabel: TextView? = null
    private val selectedImages = mutableMapOf<String, Uri>()
    private var pendingImageField: String? = null
    private var pendingImageLabel: TextView? = null

    private enum class Screen { ENTRIES, ENTRY_DETAIL, GUEST }
    private var screen = Screen.ENTRIES
    private var entriesFilter = ""
    private var currentEntryId = 0
    private var operationButton: Button? = null
    private var guestButton: Button? = null
    private var refreshEntriesOnResume = false
    private val imagePicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) {
        uri -> uri?.let(::handleSelectedImage)
    }

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        window.statusBarColor = secssNavy
        window.navigationBarColor = secssNavy

        val container = (application as SecssApplication).container
        val session = container.tokenManager.getSession()
        if (session == null) {
            startActivity(android.content.Intent(this, LoginActivity::class.java))
            finish()
            return
        }
        token = session.token
        role = session.role
        val factory = SecssViewModelFactory(container)
        inputOutputViewModel = ViewModelProvider(this, factory)[InputOutputViewModel::class.java]

        loadEntries("")
        observeViewModels()
    }

    override fun onResume() {
        super.onResume()
        if (refreshEntriesOnResume) {
            refreshEntriesOnResume = false
            loadEntries(entriesFilter)
        }
    }

    private fun observeViewModels() {
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

    private fun showHome() {
        finish()
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
        if ((UiComponents.imageSizeBytes(this, uri) ?: 0L) > UiComponents.maxImageSizeBytes) {
            toast("Cada imagen debe pesar 5 MB o menos.")
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

    // ===================== Utilidades de UI de los módulos nuevos =====================
    private fun isOwnOnly() = role == "APRENDIZ" || role == "INVITADO"

    private fun stateColor(active: Boolean) =
        if (active) Color.rgb(46, 133, 0) else Color.rgb(176, 32, 32)

    private fun enterScreen(target: Screen) {
        screen = target
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
            this@EntriesActivity,
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
                setOnClickListener { openQuotaPicker() }
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

    private fun openQuotaPicker() {
        refreshEntriesOnResume = true
        startActivity(Intent(this, QuotaActivity::class.java).putExtra(QuotaActivity.EXTRA_ENTRY_OPERATION, true))
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
                if (!MotorcyclePlate.isValid(plateValue)) {
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
        backgroundTintList = ColorStateList.valueOf(UiComponents.senaGreen)
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

}
