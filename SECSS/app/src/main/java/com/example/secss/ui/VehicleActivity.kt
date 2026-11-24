package com.example.secss.ui

import android.app.AlertDialog
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.ViewModelProvider
import com.example.secss.SecssApplication
import com.example.secss.ui.vehicle.VehicleListState
import com.example.secss.ui.vehicle.VehicleOperationState
import com.example.secss.ui.vehicle.VehicleViewModel
import com.example.secss.ui.common.MotorcyclePlate
import org.json.JSONArray
import org.json.JSONObject

class VehicleActivity : ComponentActivity() {
    private lateinit var vehicleViewModel: VehicleViewModel
    private lateinit var root: LinearLayout
    private var token = ""
    private var role = ""
    private var vehicles = JSONArray()
    private var loadingLabel: TextView? = null
    private var saveButton: Button? = null
    private val selectedImages = mutableMapOf<String, Uri>()
    private var pendingImageField: String? = null
    private var pendingImageLabel: TextView? = null
    private val imagePicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri?.let(::handleSelectedImage)
    }

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val container = (application as SecssApplication).container
        val session = container.tokenManager.getSession()
        if (session == null) {
            startActivity(android.content.Intent(this, LoginActivity::class.java))
            finish()
            return
        }
        token = session.token
        role = session.role
        vehicleViewModel = ViewModelProvider(this, SecssViewModelFactory(container))
            .get(VehicleViewModel::class.java)
        loadVehicles()
        vehicleViewModel.listState.observe(this) { state ->
            when (state) {
                VehicleListState.Loading -> loadingLabel?.text = "Cargando vehículos…"
                is VehicleListState.Loaded -> {
                    vehicles = state.vehicles
                    renderVehicles()
                }
                is VehicleListState.Error -> {
                    loadingLabel?.text = state.message
                    root.addView(UiComponents.button(this, "Reintentar").apply {
                        setOnClickListener { loadVehicles() }
                    })
                }
                VehicleListState.Idle -> Unit
            }
        }
        vehicleViewModel.operationState.observe(this) { state ->
            when (state) {
                VehicleOperationState.Loading -> saveButton?.isEnabled = false
                is VehicleOperationState.Success -> {
                    UiComponents.toast(this, state.message)
                    saveButton?.isEnabled = true
                    saveButton = null
                    vehicleViewModel.resetOperationState()
                    loadVehicles()
                }
                is VehicleOperationState.Error -> {
                    UiComponents.toast(this, state.message)
                    saveButton?.isEnabled = true
                    vehicleViewModel.resetOperationState()
                }
                VehicleOperationState.Idle -> Unit
            }
        }
    }

    private fun loadVehicles() {
        root = UiComponents.base(this, "Mis vehículos")
        root.addView(UiComponents.label(this, "SECSS · Módulo Vehículos"))
        loadingLabel = UiComponents.label(this, "Cargando vehículos…")
        root.addView(loadingLabel)
        vehicleViewModel.loadVehicles(token)
    }

    private fun renderVehicles() {
        root = UiComponents.base(this, "Mis vehículos")
        root.addView(UiComponents.label(this, "Consulta, registra y administra tus vehículos."))
        if (role == "APRENDIZ") {
            root.addView(UiComponents.button(this, "＋ Registrar vehículo").apply {
                setOnClickListener { showVehicleForm(null) }
            })
        }
        if (vehicles.length() == 0) {
            root.addView(UiComponents.label(this, "Aún no tienes vehículos registrados.").apply {
                setPadding(0, UiComponents.dp(this@VehicleActivity, 22), 0, UiComponents.dp(this@VehicleActivity, 10))
            })
        }
        for (index in 0 until vehicles.length()) {
            val item = vehicles.optJSONObject(index) ?: continue
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                val padding = UiComponents.dp(this@VehicleActivity, 15)
                setPadding(padding, UiComponents.dp(this@VehicleActivity, 14), padding, UiComponents.dp(this@VehicleActivity, 14))
                background = UiComponents.rounded(this@VehicleActivity, Color.WHITE, Color.rgb(220, 226, 229))
            }
            root.addView(card, LinearLayout.LayoutParams(-1, -2).apply {
                setMargins(0, UiComponents.dp(this@VehicleActivity, 10), 0, 0)
            })
            val type = item.optString("tipo_vehiculo")
            val detail = item.optJSONObject("detalles") ?: JSONObject()
            val identifier = if (type == "MOTO") detail.optString("placa") else detail.optString("numero_marco")
            card.addView(UiComponents.label(
                this,
                "${if (type == "MOTO") "Motocicleta" else "Bicicleta"} · " +
                    identifier.ifEmpty { "Sin identificador" }
            ).apply { setTypeface(null, Typeface.BOLD) })
            card.addView(UiComponents.label(
                this,
                "Marca: ${item.optString("marca", "—")}     Color: ${item.optString("color", "—")}"
            ))
            val specification = if (type == "MOTO") {
                "${detail.optString("cilindraje")} c.c. · Modelo ${detail.optString("modelo")}"
            } else {
                detail.optString("clase_bicicleta")
            }
            card.addView(UiComponents.label(this, "Detalle: $specification"))
            card.addView(UiComponents.label(
                this,
                "Cupo: ${if (item.optInt("estado_cupo", 0) == 1) "Activo" else "Pendiente de aprobación"}"
            ))
            card.addView(UiComponents.button(this, if (canEditVehicle(item)) "Consultar / editar" else "Consultar")
                .apply { setOnClickListener { showVehicleForm(item) } })
            if (role == "APRENDIZ" || role == "INVITADO") {
                card.addView(UiComponents.button(this, "Retirar vehículo").apply {
                    setOnClickListener { confirmDelete(item) }
                })
            }
        }
        root.addView(UiComponents.button(this, "Volver al menú SECSS").apply { setOnClickListener { finish() } })
    }

    private fun showVehicleForm(existing: JSONObject?) {
        val editing = existing != null
        val canEdit = role == "APRENDIZ" || (editing && role == "INVITADO")
        selectedImages.clear()
        val details = existing?.optJSONObject("detalles") ?: JSONObject()
        root = UiComponents.base(this, if (editing) "Detalle del vehículo" else "Registrar vehículo")

        val kind = Spinner(this)
        kind.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, arrayOf("MOTO", "BICICLETA"))
        if (editing) kind.setSelection(if (existing?.optString("tipo_vehiculo") == "BICICLETA") 1 else 0)
        kind.isEnabled = !editing && canEdit
        root.addView(kind)

        val make = UiComponents.input(this, "Marca").apply {
            setText(existing?.optString("marca").orEmpty())
            isEnabled = canEdit
        }
        root.addView(make)
        val color = UiComponents.input(this, "Color").apply {
            setText(existing?.optString("color").orEmpty())
            isEnabled = canEdit
        }
        root.addView(color)
        val plate = UiComponents.input(this, "Placa · ejemplo ABC12G").apply {
            inputType = android.text.InputType.TYPE_CLASS_TEXT or
                android.text.InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS
            setText(details.optString("placa"))
            isEnabled = canEdit
        }
        root.addView(plate)
        val cylinderCapacity = UiComponents.input(this, "Cilindraje (c.c.)").apply {
            inputType = 2
            setText(details.optString("cilindraje"))
            isEnabled = canEdit
        }
        root.addView(cylinderCapacity)
        val year = UiComponents.input(this, "Modelo (año)").apply {
            inputType = 2
            setText(details.optString("modelo"))
            isEnabled = canEdit
        }
        root.addView(year)
        val frame = UiComponents.input(this, "Número de marco").apply {
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
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) = updateFields()
        }
        updateFields()

        root.addView(UiComponents.label(this, "Soportes documentales (JPG, PNG o WEBP; máximo 5 MB cada uno)").apply {
            setTypeface(null, Typeface.BOLD)
            setPadding(0, UiComponents.dp(this@VehicleActivity, 18), 0, UiComponents.dp(this@VehicleActivity, 4))
        })
        val savedImages = existing?.optJSONObject("imagenes") ?: JSONObject()
        addImagePicker("Tarjeta de propiedad", "imagen_url_tarjeta_propiedad", savedImages.optString("imagen_url_tarjeta_propiedad"), canEdit, true)
        addImagePicker("Identificación / chasis", "imagen_url_identificacion_vehiculo", savedImages.optString("imagen_url_identificacion_vehiculo"), canEdit, true)
        addImagePicker("Foto del vehículo", "imagen_url_vehiculo", savedImages.optString("imagen_url_vehiculo"), canEdit, true)
        addImagePicker("SOAT vigente", "imagen_url_soat", savedImages.optString("imagen_url_soat"), canEdit, false)
        addImagePicker("Tecnomecánica vigente", "imagen_url_tecnomecanica_vigente", savedImages.optString("imagen_url_tecnomecanica_vigente"), canEdit, false)
        updateFields()

        if (canEdit) {
            saveButton = UiComponents.button(this, if (editing) "Guardar cambios" else "Registrar")
            root.addView(saveButton)
            saveButton?.setOnClickListener {
                val type = kind.selectedItem.toString()
                val makeValue = make.text.toString().trim()
                val colorValue = color.text.toString().trim()
                if (makeValue.isEmpty() || colorValue.isEmpty()) {
                    UiComponents.toast(this, "Completa marca y color.")
                    return@setOnClickListener
                }
                val payload = JSONObject()
                    .put("tipo_vehiculo", type)
                    .put("marca", makeValue)
                    .put("color", colorValue)
                if (type == "MOTO") {
                    val plateValue = plate.text.toString().trim().uppercase()
                    if (!MotorcyclePlate.isValid(plateValue)) {
                        UiComponents.toast(this, "Revisa la placa (ejemplo ABC12G).")
                        return@setOnClickListener
                    }
                    if (cylinderCapacity.text.isEmpty() || year.text.isEmpty()) {
                        UiComponents.toast(this, "Completa cilindraje y modelo.")
                        return@setOnClickListener
                    }
                    payload.put("placa", plateValue)
                        .put("cilindraje", cylinderCapacity.text.toString())
                        .put("modelo", year.text.toString())
                } else {
                    val frameValue = frame.text.toString().trim()
                    if (frameValue.length < 5) {
                        UiComponents.toast(this, "El número de marco debe tener al menos 5 caracteres.")
                        return@setOnClickListener
                    }
                    payload.put("numero_marco", frameValue.uppercase())
                        .put("clase_bicicleta", bikeClass.selectedItem.toString())
                }
                saveButton?.isEnabled = false
                vehicleViewModel.saveVehicle(
                    id = if (editing) existing?.optInt("id") else null,
                    payload = payload,
                    images = selectedImages.toMap()
                )
            }
        }
        root.addView(UiComponents.button(this, "Volver a mis vehículos").apply { setOnClickListener { loadVehicles() } })
    }

    private fun addImagePicker(title: String, key: String, previous: String, canEdit: Boolean, common: Boolean) {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, UiComponents.dp(this@VehicleActivity, 4), 0, UiComponents.dp(this@VehicleActivity, 5))
            tag = if (common) "common" else "moto"
        }
        row.addView(UiComponents.label(this, title).apply { textSize = 14f })
        val status = UiComponents.label(
            this,
            if (previous.isEmpty()) "Sin archivo seleccionado" else "Soporte ya registrado"
        ).apply { textSize = 12f }
        row.addView(status)
        if (canEdit) {
            row.addView(UiComponents.button(this, "Seleccionar imagen").apply {
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
            UiComponents.toast(this, "Selecciona una imagen JPG, PNG o WEBP.")
            return
        }
        if ((UiComponents.imageSizeBytes(this, uri) ?: 0L) > UiComponents.maxImageSizeBytes) {
            UiComponents.toast(this, "Cada imagen debe pesar 5 MB o menos.")
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
            .setPositiveButton("Retirar") { _, _ -> vehicleViewModel.deleteVehicle(item.optInt("id")) }
            .show()
    }

    private fun canEditVehicle(item: JSONObject) =
        role == "APRENDIZ" || (role == "INVITADO" && item.has("id"))
}
