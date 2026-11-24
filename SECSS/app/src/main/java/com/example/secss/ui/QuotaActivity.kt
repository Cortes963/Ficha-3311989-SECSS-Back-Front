package com.example.secss.ui

import android.app.AlertDialog
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.lifecycle.ViewModelProvider
import com.example.secss.SecssApplication
import com.example.secss.data.repository.PagedResult
import com.example.secss.ui.common.UiState
import com.example.secss.ui.common.day
import com.example.secss.ui.common.str
import com.example.secss.ui.inputoutput.InputOutputViewModel
import com.example.secss.ui.quota.QuotaViewModel
import org.json.JSONObject

class QuotaActivity : ComponentActivity() {
    private enum class Screen { PICKER, OPERATION, QUOTAS, QUOTA_DETAIL }

    private lateinit var quotaViewModel: QuotaViewModel
    private lateinit var inputOutputViewModel: InputOutputViewModel
    private lateinit var root: LinearLayout
    private var token = ""
    private var role = ""
    private var loadingLabel: TextView? = null
    private var operationButton: Button? = null
    private var screen = Screen.QUOTAS
    private var currentQuotaUser = 0
    private var currentQuotaVehicle = 0
    private val isEntryOperation
        get() = intent.getBooleanExtra(EXTRA_ENTRY_OPERATION, false)

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
        val factory = SecssViewModelFactory(container)
        quotaViewModel = ViewModelProvider(this, factory)[QuotaViewModel::class.java]
        inputOutputViewModel = ViewModelProvider(this, factory)[InputOutputViewModel::class.java]
        if (isEntryOperation) loadQuotaPicker() else loadQuotas()
        observeViewModels()
    }

    private fun observeViewModels() {
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
                    ) { finish() }
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
                ) { finish() }
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
        if (isEntryOperation) {
            inputOutputViewModel.operationState.observe(this) { state ->
                when (state) {
                    is UiState.Success -> {
                        toast(state.data)
                        inputOutputViewModel.resetOperation()
                        finish()
                    }
                    is UiState.Error -> {
                        toast(state.message)
                        operationButton?.isEnabled = true
                        inputOutputViewModel.resetOperation()
                    }
                    else -> Unit
                }
            }
        }
    }

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
        backButton("Volver a entradas y salidas") { finish() }
    }

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
            card.addView(button("Registrar salida").apply {
                setOnClickListener { confirmExit(openId) }
            })
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
        backButton("Volver al menú SECSS") { finish() }
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
        backButton("Volver al menú SECSS") { finish() }
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

    private fun confirmExit(entryId: Int) {
        AlertDialog.Builder(this)
            .setTitle("Registrar salida")
            .setMessage("¿Confirmas la salida de este vehículo?")
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Registrar") { _, _ -> inputOutputViewModel.registerExit(token, entryId) }
            .show()
    }

    private fun enterScreen(target: Screen) {
        screen = target
    }

    private fun base(title: String) {
        val scroll = android.widget.ScrollView(this)
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
            root.addView(label(title).apply {
                textSize = 25f
                setTypeface(null, Typeface.BOLD)
                setTextColor(UiComponents.secssNavy)
                setPadding(0, 0, 0, dp(18))
            })
        }
        window.statusBarColor = UiComponents.secssNavy
        window.navigationBarColor = UiComponents.secssNavy
    }

    private fun showLoading(title: String, message: String) {
        base(title)
        loadingLabel = label(message)
        root.addView(loadingLabel)
    }

    private fun showLoadError(message: String, retry: () -> Unit, backText: String, back: () -> Unit) {
        loadingLabel?.text = message
        root.addView(button("Reintentar").apply { setOnClickListener { retry() } })
        backButton(backText, back)
    }

    private fun isOwnOnly() = role == "APRENDIZ" || role == "INVITADO"

    private fun stateColor(active: Boolean) =
        if (active) Color.rgb(46, 133, 0) else Color.rgb(176, 32, 32)

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
            setTextColor(UiComponents.secssNavy)
        })
    }

    private fun backButton(text: String, action: () -> Unit) {
        root.addView(button(text).apply { setOnClickListener { action() } })
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
        layoutParams = LinearLayout.LayoutParams(-1, -2).apply { setMargins(0, dp(5), 0, dp(5)) }
    }

    private fun button(text: String) = Button(this).apply {
        this.text = text
        isAllCaps = false
        setTextColor(Color.WHITE)
        backgroundTintList = ColorStateList.valueOf(UiComponents.senaGreen)
        layoutParams = LinearLayout.LayoutParams(-1, -2).apply { setMargins(0, dp(8), 0, dp(4)) }
    }

    private fun rounded(color: Int, stroke: Int) = GradientDrawable().apply {
        setColor(color)
        cornerRadius = dp(16).toFloat()
        setStroke(dp(1), stroke)
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density + 0.5f).toInt()

    private fun toast(message: String) {
        UiComponents.toast(this, message)
    }

    companion object {
        const val EXTRA_ENTRY_OPERATION = "com.example.secss.ui.EXTRA_ENTRY_OPERATION"
    }
}
