package com.example.secss.ui

import android.app.Activity
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.secss.SecssApplication
import com.example.secss.data.remote.SecssApiService
import com.example.secss.data.repository.AuthSession
import com.example.secss.data.repository.PagedResult
import com.example.secss.data.repository.RepositoryCallback
import com.example.secss.data.repository.apiCallback
import com.example.secss.data.repository.toPaged
import com.example.secss.ui.common.UiState
import com.example.secss.ui.common.callbackTo
import com.example.secss.ui.common.dateTime
import com.example.secss.ui.common.str
import org.json.JSONObject

/**
 * Módulo de atención (equivalente móvil de attention.routes.js del backend):
 * PQRS para APRENDIZ/INVITADO y Reportes para CELADOR/JEFE_SEGURIDAD, todo en un solo archivo.
 */

// ═════════════════════ REPOSITORIOS (acceso a la API: /pqrs y /reportes) ═════════════════════
class PqrsRepository(private val apiService: SecssApiService) {

    /** El backend devuelve solo las PQRS del usuario del token (excepto ADMINISTRADOR). */
    fun getPqrs(token: String, callback: RepositoryCallback<PagedResult>) {
        apiService.request(
            method = "GET",
            path = "/pqrs?limite=100",
            token = token,
            callback = apiCallback(callback) { it.toPaged() }
        )
    }

    /** Incluye la respuesta del administrador (respuesta_*) cuando ya existe. */
    fun getPqrsDetail(token: String, id: Int, callback: RepositoryCallback<JSONObject>) {
        apiService.request(
            method = "GET",
            path = "/pqrs/$id",
            token = token,
            callback = apiCallback(callback) { it.optJSONObject("datos") ?: JSONObject() }
        )
    }

    fun createPqrs(
        token: String,
        subject: String,
        text: String,
        callback: RepositoryCallback<String>
    ) {
        apiService.request(
            method = "POST",
            path = "/pqrs",
            body = JSONObject().put("asunto", subject).put("cuerpo", text),
            token = token,
            callback = apiCallback(callback) { it.optString("mensaje", "PQRS radicada.") }
        )
    }

    /** Solo el dueño, mientras esté RADICADA y dentro de la ventana de edición del backend. */
    fun updatePqrs(
        token: String,
        id: Int,
        subject: String,
        text: String,
        callback: RepositoryCallback<String>
    ) {
        apiService.request(
            method = "PUT",
            path = "/pqrs/$id",
            body = JSONObject().put("asunto", subject).put("cuerpo", text),
            token = token,
            callback = apiCallback(callback) { it.optString("mensaje", "PQRS actualizada.") }
        )
    }
}

class ReportRepository(private val apiService: SecssApiService) {

    /** CELADOR ve solo sus reportes; JEFE_SEGURIDAD ve todos. */
    fun getReports(token: String, callback: RepositoryCallback<PagedResult>) {
        apiService.request(
            method = "GET",
            path = "/reportes?limite=100",
            token = token,
            callback = apiCallback(callback) { it.toPaged() }
        )
    }

    fun getReportDetail(token: String, id: Int, callback: RepositoryCallback<JSONObject>) {
        apiService.request(
            method = "GET",
            path = "/reportes/$id",
            token = token,
            callback = apiCallback(callback) { it.optJSONObject("datos") ?: JSONObject() }
        )
    }

    /** Solo CELADOR. entryExitId es opcional (entrada/salida relacionada). */
    fun createReport(
        token: String,
        subject: String,
        text: String,
        entryExitId: Int?,
        callback: RepositoryCallback<String>
    ) {
        val body = JSONObject().put("asunto", subject).put("cuerpo", text)
        if (entryExitId != null) body.put("id_entrada_salida", entryExitId)
        apiService.request(
            method = "POST",
            path = "/reportes",
            body = body,
            token = token,
            callback = apiCallback(callback) {
                it.optString("mensaje", "Reporte registrado correctamente.")
            }
        )
    }

    /** Solo el CELADOR dueño, dentro de la ventana de edición del backend. */
    fun updateReport(
        token: String,
        id: Int,
        subject: String,
        text: String,
        callback: RepositoryCallback<String>
    ) {
        apiService.request(
            method = "PUT",
            path = "/reportes/$id",
            body = JSONObject().put("asunto", subject).put("cuerpo", text),
            token = token,
            callback = apiCallback(callback) { it.optString("mensaje", "Reporte actualizado.") }
        )
    }
}

// ═════════════════════ VIEWMODELS ═════════════════════
class PqrsViewModel(private val repository: PqrsRepository) : ViewModel() {
    private val mutableListState = MutableLiveData<UiState<PagedResult>>(UiState.Idle)
    val listState: LiveData<UiState<PagedResult>> = mutableListState

    private val mutableDetailState = MutableLiveData<UiState<JSONObject>>(UiState.Idle)
    val detailState: LiveData<UiState<JSONObject>> = mutableDetailState

    private val mutableOperationState = MutableLiveData<UiState<String>>(UiState.Idle)
    val operationState: LiveData<UiState<String>> = mutableOperationState

    fun loadList(token: String) {
        mutableListState.value = UiState.Loading
        repository.getPqrs(token, callbackTo(mutableListState))
    }

    fun loadDetail(token: String, id: Int) {
        mutableDetailState.value = UiState.Loading
        repository.getPqrsDetail(token, id, callbackTo(mutableDetailState))
    }

    fun create(token: String, subject: String, text: String) {
        mutableOperationState.value = UiState.Loading
        repository.createPqrs(token, subject, text, callbackTo(mutableOperationState))
    }

    fun update(token: String, id: Int, subject: String, text: String) {
        mutableOperationState.value = UiState.Loading
        repository.updatePqrs(token, id, subject, text, callbackTo(mutableOperationState))
    }

    fun resetOperation() {
        mutableOperationState.value = UiState.Idle
    }
}

class ReportViewModel(private val repository: ReportRepository) : ViewModel() {
    private val mutableListState = MutableLiveData<UiState<PagedResult>>(UiState.Idle)
    val listState: LiveData<UiState<PagedResult>> = mutableListState

    private val mutableDetailState = MutableLiveData<UiState<JSONObject>>(UiState.Idle)
    val detailState: LiveData<UiState<JSONObject>> = mutableDetailState

    private val mutableOperationState = MutableLiveData<UiState<String>>(UiState.Idle)
    val operationState: LiveData<UiState<String>> = mutableOperationState

    fun loadList(token: String) {
        mutableListState.value = UiState.Loading
        repository.getReports(token, callbackTo(mutableListState))
    }

    fun loadDetail(token: String, id: Int) {
        mutableDetailState.value = UiState.Loading
        repository.getReportDetail(token, id, callbackTo(mutableDetailState))
    }

    fun create(token: String, subject: String, text: String, entryExitId: Int?) {
        mutableOperationState.value = UiState.Loading
        repository.createReport(token, subject, text, entryExitId, callbackTo(mutableOperationState))
    }

    fun update(token: String, id: Int, subject: String, text: String) {
        mutableOperationState.value = UiState.Loading
        repository.updateReport(token, id, subject, text, callbackTo(mutableOperationState))
    }

    fun resetOperation() {
        mutableOperationState.value = UiState.Idle
    }
}

// ═════════════════════ PIEZAS DE INTERFAZ COMPARTIDAS ═════════════════════
/** Piezas de interfaz compartidas por las pantallas de PQRS y Reportes (misma paleta de UiComponents). */
internal object ScreenParts {
    /** PQRS: aprendices e invitados. */
    val PQRS_ROLES = setOf("APRENDIZ", "INVITADO")

    /** Reportes: el backend solo permite CELADOR (crea/edita los suyos) y JEFE_SEGURIDAD (consulta). */
    val REPORT_ROLES = setOf("CELADOR", "JEFE_SEGURIDAD")

    private val border = Color.rgb(220, 226, 229)
    private val errorColor = Color.rgb(176, 42, 55)

    /** Devuelve la sesión si existe y el rol está permitido; si no, redirige/cierra y devuelve null. */
    fun requireSession(activity: Activity, allowedRoles: Set<String>): AuthSession? {
        val container = (activity.application as SecssApplication).container
        val session = container.tokenManager.getSession()
        if (session == null) {
            activity.startActivity(Intent(activity, LoginActivity::class.java))
            activity.finish()
            return null
        }
        if (session.role !in allowedRoles) {
            UiComponents.toast(activity, "No tienes permisos para este módulo.")
            activity.finish()
            return null
        }
        return session
    }

    fun card(activity: Activity, parent: LinearLayout): LinearLayout {
        val card = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            val horizontal = UiComponents.dp(activity, 18)
            val vertical = UiComponents.dp(activity, 14)
            setPadding(horizontal, vertical, horizontal, vertical)
            background = UiComponents.rounded(activity, Color.WHITE, border)
        }
        parent.addView(card, LinearLayout.LayoutParams(-1, -2).apply {
            setMargins(0, UiComponents.dp(activity, 10), 0, 0)
        })
        return card
    }

    fun title(activity: Activity, text: String): TextView =
        UiComponents.label(activity, text).apply {
            textSize = 18f
            setTypeface(null, Typeface.BOLD)
            setTextColor(UiComponents.secssNavy)
        }

    fun muted(activity: Activity, text: String): TextView =
        UiComponents.label(activity, text).apply {
            textSize = 13f
            setTextColor(Color.rgb(80, 88, 92))
        }

    fun errorLabel(activity: Activity, text: String): TextView =
        UiComponents.label(activity, text).apply { setTextColor(errorColor) }

    fun chip(activity: Activity, text: String, color: Int): TextView =
        TextView(activity).apply {
            this.text = text
            textSize = 12f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            val horizontal = UiComponents.dp(activity, 10)
            val vertical = UiComponents.dp(activity, 4)
            setPadding(horizontal, vertical, horizontal, vertical)
            background = UiComponents.rounded(activity, color, color)
            layoutParams = LinearLayout.LayoutParams(-2, -2).apply {
                setMargins(0, UiComponents.dp(activity, 4), 0, UiComponents.dp(activity, 4))
            }
        }

    fun secondaryButton(activity: Activity, text: String) =
        UiComponents.button(activity, text).apply {
            backgroundTintList = ColorStateList.valueOf(UiComponents.secssNavy)
        }

    fun multilineInput(activity: Activity, hintText: String): EditText =
        UiComponents.input(activity, hintText).apply {
            setSingleLine(false)
            inputType = InputType.TYPE_CLASS_TEXT or
                InputType.TYPE_TEXT_FLAG_MULTI_LINE or
                InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
            minLines = 4
            gravity = Gravity.TOP or Gravity.START
        }

    /** Lee un campo 0/1 que el backend puede entregar como número, booleano o texto. */
    fun intOf(json: JSONObject, key: String): Int = when (val value = json.opt(key)) {
        is Boolean -> if (value) 1 else 0
        is Number -> value.toInt()
        is String -> value.toIntOrNull() ?: 0
        else -> 0
    }

    /** PQRS.estado: 1 RADICADO, 2 EN_TRAMITE, 3 RESUELTO, 4 CERRADO. */
    fun pqrsStatus(estado: Int): Pair<String, Int> = when (estado) {
        1 -> "Radicada" to Color.rgb(108, 117, 125)
        2 -> "En trámite" to Color.rgb(196, 120, 0)
        3 -> "Resuelta" to UiComponents.senaGreen
        4 -> "Cerrada" to UiComponents.secssNavy
        else -> "Sin estado" to Color.rgb(108, 117, 125)
    }

    /** reporte.estado: 0 NO_REVISADO, 1 REVISADO. */
    fun reportStatus(estado: Int): Pair<String, Int> =
        if (estado == 1) "Revisado" to UiComponents.senaGreen
        else "No revisado" to Color.rgb(196, 120, 0)
}

// ═════════════════════ PQRS (APRENDIZ e INVITADO) ═════════════════════
/** Lista de PQRS propias (APRENDIZ e INVITADO). */
class PqrsListActivity : ComponentActivity() {
    private lateinit var viewModel: PqrsViewModel
    private var token = ""

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val session = ScreenParts.requireSession(this, ScreenParts.PQRS_ROLES) ?: return
        token = session.token
        val container = (application as SecssApplication).container
        viewModel = ViewModelProvider(this, SecssViewModelFactory(container))[PqrsViewModel::class.java]
        viewModel.listState.observe(this) { render(it) }
    }

    override fun onResume() {
        super.onResume()
        if (token.isNotEmpty()) viewModel.loadList(token)
    }

    private fun render(state: UiState<PagedResult>) {
        val root = UiComponents.base(this, "PQRS")
        root.addView(
            UiComponents.label(
                this,
                "Radica peticiones, quejas, reclamos o sugerencias y consulta la respuesta de la administración."
            )
        )
        root.addView(UiComponents.button(this, "Nueva PQRS").apply {
            setOnClickListener {
                startActivity(Intent(this@PqrsListActivity, PqrsFormActivity::class.java))
            }
        })
        when (state) {
            is UiState.Success -> renderRows(root, state.data)
            is UiState.Error -> {
                root.addView(ScreenParts.errorLabel(this, state.message))
                root.addView(UiComponents.button(this, "Reintentar").apply {
                    setOnClickListener { viewModel.loadList(token) }
                })
            }
            else -> root.addView(UiComponents.label(this, "Cargando…"))
        }
        root.addView(ScreenParts.secondaryButton(this, "Volver al menú SECSS").apply {
            setOnClickListener { finish() }
        })
    }

    private fun renderRows(root: LinearLayout, data: PagedResult) {
        if (data.rows.length() == 0) {
            root.addView(UiComponents.label(this, "Aún no has radicado ninguna PQRS."))
            return
        }
        for (index in 0 until data.rows.length()) {
            val row = data.rows.optJSONObject(index) ?: continue
            val card = ScreenParts.card(this, root)
            card.addView(ScreenParts.title(this, row.str("asunto")))
            val (label, color) = ScreenParts.pqrsStatus(ScreenParts.intOf(row, "estado"))
            card.addView(ScreenParts.chip(this, label, color))
            card.addView(ScreenParts.muted(this, "Radicada: ${row.dateTime("fecha_creacion")}"))
            if (ScreenParts.intOf(row, "tiene_respuesta") == 1) {
                card.addView(ScreenParts.muted(this, "Ya tiene respuesta de la administración."))
            }
            val id = row.optInt("id", 0)
            card.addView(UiComponents.button(this, "Ver detalle").apply {
                setOnClickListener {
                    startActivity(
                        Intent(this@PqrsListActivity, PqrsDetailActivity::class.java)
                            .putExtra(PqrsDetailActivity.EXTRA_ID, id)
                    )
                }
            })
        }
    }
}

/** Detalle de una PQRS propia, con la respuesta del administrador si ya existe. */
class PqrsDetailActivity : ComponentActivity() {
    private lateinit var viewModel: PqrsViewModel
    private var token = ""
    private val pqrsId get() = intent.getIntExtra(EXTRA_ID, 0)

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val session = ScreenParts.requireSession(this, ScreenParts.PQRS_ROLES) ?: return
        token = session.token
        val container = (application as SecssApplication).container
        viewModel = ViewModelProvider(this, SecssViewModelFactory(container))[PqrsViewModel::class.java]
        viewModel.detailState.observe(this) { render(it) }
    }

    override fun onResume() {
        super.onResume()
        if (token.isNotEmpty()) viewModel.loadDetail(token, pqrsId)
    }

    private fun render(state: UiState<JSONObject>) {
        val root = UiComponents.base(this, "Detalle de la PQRS")
        when (state) {
            is UiState.Success -> renderDetail(root, state.data)
            is UiState.Error -> {
                root.addView(ScreenParts.errorLabel(this, state.message))
                root.addView(UiComponents.button(this, "Reintentar").apply {
                    setOnClickListener { viewModel.loadDetail(token, pqrsId) }
                })
            }
            else -> root.addView(UiComponents.label(this, "Cargando…"))
        }
        root.addView(ScreenParts.secondaryButton(this, "Volver a PQRS").apply {
            setOnClickListener { finish() }
        })
    }

    private fun renderDetail(root: LinearLayout, data: JSONObject) {
        val estado = ScreenParts.intOf(data, "estado")
        val card = ScreenParts.card(this, root)
        card.addView(ScreenParts.title(this, data.str("asunto")))
        val (label, color) = ScreenParts.pqrsStatus(estado)
        card.addView(ScreenParts.chip(this, label, color))
        card.addView(ScreenParts.muted(this, "Radicada: ${data.dateTime("fecha_creacion")}"))
        card.addView(UiComponents.label(this, data.str("cuerpo")))

        val answered = data.has("respuesta_id") && !data.isNull("respuesta_id")
        val answerCard = ScreenParts.card(this, root)
        if (answered) {
            answerCard.addView(ScreenParts.muted(this, "Respuesta de la administración"))
            answerCard.addView(ScreenParts.title(this, data.str("respuesta_asunto")))
            answerCard.addView(UiComponents.label(this, data.str("respuesta_cuerpo")))
            answerCard.addView(
                ScreenParts.muted(
                    this,
                    "Respondida por ${data.str("respuesta_respondiente")} · ${data.dateTime("respuesta_fecha")}"
                )
            )
        } else {
            answerCard.addView(UiComponents.label(this, "Aún no tiene respuesta de la administración."))
        }

        if (estado == 1 && !answered) {
            root.addView(UiComponents.button(this, "Editar PQRS").apply {
                setOnClickListener {
                    startActivity(
                        Intent(this@PqrsDetailActivity, PqrsFormActivity::class.java)
                            .putExtra(PqrsFormActivity.EXTRA_ID, pqrsId)
                            .putExtra(PqrsFormActivity.EXTRA_SUBJECT, data.optString("asunto", ""))
                            .putExtra(PqrsFormActivity.EXTRA_BODY, data.optString("cuerpo", ""))
                    )
                }
            })
        }
    }

    companion object {
        const val EXTRA_ID = "pqrs_id"
    }
}

/** Formulario para radicar una PQRS nueva o editar una existente (EXTRA_ID > 0). */
class PqrsFormActivity : ComponentActivity() {
    private lateinit var viewModel: PqrsViewModel
    private var token = ""
    private var submitButton: Button? = null
    private val pqrsId get() = intent.getIntExtra(EXTRA_ID, 0)
    private val editing get() = pqrsId > 0

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val session = ScreenParts.requireSession(this, ScreenParts.PQRS_ROLES) ?: return
        token = session.token
        val container = (application as SecssApplication).container
        viewModel = ViewModelProvider(this, SecssViewModelFactory(container))[PqrsViewModel::class.java]
        renderForm()
        viewModel.operationState.observe(this) { operation ->
            when (operation) {
                is UiState.Loading -> submitButton?.isEnabled = false
                is UiState.Success -> {
                    UiComponents.toast(this, operation.data)
                    viewModel.resetOperation()
                    finish()
                }
                is UiState.Error -> {
                    UiComponents.toast(this, operation.message)
                    submitButton?.isEnabled = true
                    viewModel.resetOperation()
                }
                else -> Unit
            }
        }
    }

    private fun renderForm() {
        val root = UiComponents.base(this, if (editing) "Editar PQRS" else "Nueva PQRS")
        root.addView(
            UiComponents.label(
                this,
                if (editing) {
                    "Solo puedes editarla mientras esté radicada y durante los primeros minutos."
                } else {
                    "Cuéntanos tu petición, queja, reclamo o sugerencia."
                }
            )
        )
        val subject = UiComponents.input(this, "Asunto").apply {
            setText(intent.getStringExtra(EXTRA_SUBJECT).orEmpty())
        }
        val body = ScreenParts.multilineInput(this, "Descripción").apply {
            setText(intent.getStringExtra(EXTRA_BODY).orEmpty())
        }
        root.addView(subject)
        root.addView(body)

        val submit = UiComponents.button(this, if (editing) "Guardar cambios" else "Radicar PQRS")
        submit.setOnClickListener {
            val subjectText = subject.text.toString().trim()
            val bodyText = body.text.toString().trim()
            if (subjectText.isEmpty() || bodyText.isEmpty()) {
                UiComponents.toast(this, "Completa el asunto y la descripción.")
                return@setOnClickListener
            }
            if (editing) {
                viewModel.update(token, pqrsId, subjectText, bodyText)
            } else {
                viewModel.create(token, subjectText, bodyText)
            }
        }
        submitButton = submit
        root.addView(submit)
        root.addView(ScreenParts.secondaryButton(this, "Cancelar").apply {
            setOnClickListener { finish() }
        })
    }

    companion object {
        const val EXTRA_ID = "pqrs_id"
        const val EXTRA_SUBJECT = "pqrs_subject"
        const val EXTRA_BODY = "pqrs_body"
    }
}

// ═════════════════════ REPORTES (CELADOR y JEFE_SEGURIDAD) ═════════════════════
/** Lista de reportes: CELADOR ve y crea los suyos; JEFE_SEGURIDAD consulta todos. */
class ReportListActivity : ComponentActivity() {
    private lateinit var viewModel: ReportViewModel
    private var token = ""
    private var role = ""

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val session = ScreenParts.requireSession(this, ScreenParts.REPORT_ROLES) ?: return
        token = session.token
        role = session.role
        val container = (application as SecssApplication).container
        viewModel = ViewModelProvider(this, SecssViewModelFactory(container))[ReportViewModel::class.java]
        viewModel.listState.observe(this) { render(it) }
    }

    override fun onResume() {
        super.onResume()
        if (token.isNotEmpty()) viewModel.loadList(token)
    }

    private fun render(state: UiState<PagedResult>) {
        val root = UiComponents.base(this, "Reportes")
        root.addView(
            UiComponents.label(
                this,
                if (role == "CELADOR") {
                    "Registra reportes sobre lo ocurrido en el complejo y consulta los tuyos."
                } else {
                    "Consulta los reportes registrados por los celadores."
                }
            )
        )
        if (role == "CELADOR") {
            root.addView(UiComponents.button(this, "Nuevo reporte").apply {
                setOnClickListener {
                    startActivity(Intent(this@ReportListActivity, ReportFormActivity::class.java))
                }
            })
        }
        when (state) {
            is UiState.Success -> renderRows(root, state.data)
            is UiState.Error -> {
                root.addView(ScreenParts.errorLabel(this, state.message))
                root.addView(UiComponents.button(this, "Reintentar").apply {
                    setOnClickListener { viewModel.loadList(token) }
                })
            }
            else -> root.addView(UiComponents.label(this, "Cargando…"))
        }
        root.addView(ScreenParts.secondaryButton(this, "Volver al menú SECSS").apply {
            setOnClickListener { finish() }
        })
    }

    private fun renderRows(root: LinearLayout, data: PagedResult) {
        if (data.rows.length() == 0) {
            root.addView(UiComponents.label(this, "No hay reportes registrados."))
            return
        }
        for (index in 0 until data.rows.length()) {
            val row = data.rows.optJSONObject(index) ?: continue
            val card = ScreenParts.card(this, root)
            card.addView(ScreenParts.title(this, row.str("asunto")))
            val (label, color) = ScreenParts.reportStatus(ScreenParts.intOf(row, "estado"))
            card.addView(ScreenParts.chip(this, label, color))
            card.addView(ScreenParts.muted(this, "Celador: ${row.str("celador")}"))
            card.addView(ScreenParts.muted(this, row.dateTime("fecha_hora")))
            val id = row.optInt("id", 0)
            card.addView(UiComponents.button(this, "Ver detalle").apply {
                setOnClickListener {
                    startActivity(
                        Intent(this@ReportListActivity, ReportDetailActivity::class.java)
                            .putExtra(ReportDetailActivity.EXTRA_ID, id)
                    )
                }
            })
        }
    }
}

/** Detalle de un reporte. El CELADOR dueño puede editarlo (el backend valida dueño y ventana de edición). */
class ReportDetailActivity : ComponentActivity() {
    private lateinit var viewModel: ReportViewModel
    private var token = ""
    private var role = ""
    private val reportId get() = intent.getIntExtra(EXTRA_ID, 0)

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val session = ScreenParts.requireSession(this, ScreenParts.REPORT_ROLES) ?: return
        token = session.token
        role = session.role
        val container = (application as SecssApplication).container
        viewModel = ViewModelProvider(this, SecssViewModelFactory(container))[ReportViewModel::class.java]
        viewModel.detailState.observe(this) { render(it) }
    }

    override fun onResume() {
        super.onResume()
        if (token.isNotEmpty()) viewModel.loadDetail(token, reportId)
    }

    private fun render(state: UiState<JSONObject>) {
        val root = UiComponents.base(this, "Detalle del reporte")
        when (state) {
            is UiState.Success -> renderDetail(root, state.data)
            is UiState.Error -> {
                root.addView(ScreenParts.errorLabel(this, state.message))
                root.addView(UiComponents.button(this, "Reintentar").apply {
                    setOnClickListener { viewModel.loadDetail(token, reportId) }
                })
            }
            else -> root.addView(UiComponents.label(this, "Cargando…"))
        }
        root.addView(ScreenParts.secondaryButton(this, "Volver a Reportes").apply {
            setOnClickListener { finish() }
        })
    }

    private fun renderDetail(root: LinearLayout, data: JSONObject) {
        val card = ScreenParts.card(this, root)
        card.addView(ScreenParts.title(this, data.str("asunto")))
        val (label, color) = ScreenParts.reportStatus(ScreenParts.intOf(data, "estado"))
        card.addView(ScreenParts.chip(this, label, color))
        card.addView(ScreenParts.muted(this, "Celador: ${data.str("celador")}"))
        card.addView(ScreenParts.muted(this, data.dateTime("fecha_hora")))
        if (data.has("id_entrada_salida") && !data.isNull("id_entrada_salida")) {
            card.addView(
                ScreenParts.muted(this, "Entrada/salida relacionada: #${data.optInt("id_entrada_salida")}")
            )
        }
        card.addView(UiComponents.label(this, data.str("cuerpo")))

        if (role == "CELADOR") {
            root.addView(UiComponents.button(this, "Editar reporte").apply {
                setOnClickListener {
                    startActivity(
                        Intent(this@ReportDetailActivity, ReportFormActivity::class.java)
                            .putExtra(ReportFormActivity.EXTRA_ID, reportId)
                            .putExtra(ReportFormActivity.EXTRA_SUBJECT, data.optString("asunto", ""))
                            .putExtra(ReportFormActivity.EXTRA_BODY, data.optString("cuerpo", ""))
                    )
                }
            })
        }
    }

    companion object {
        const val EXTRA_ID = "report_id"
    }
}

/** Formulario para crear un reporte nuevo o editar uno existente (EXTRA_ID > 0). Solo CELADOR. */
class ReportFormActivity : ComponentActivity() {
    private lateinit var viewModel: ReportViewModel
    private var token = ""
    private var submitButton: Button? = null
    private val reportId get() = intent.getIntExtra(EXTRA_ID, 0)
    private val editing get() = reportId > 0

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val session = ScreenParts.requireSession(this, setOf("CELADOR")) ?: return
        token = session.token
        val container = (application as SecssApplication).container
        viewModel = ViewModelProvider(this, SecssViewModelFactory(container))[ReportViewModel::class.java]
        renderForm()
        viewModel.operationState.observe(this) { operation ->
            when (operation) {
                is UiState.Loading -> submitButton?.isEnabled = false
                is UiState.Success -> {
                    UiComponents.toast(this, operation.data)
                    viewModel.resetOperation()
                    finish()
                }
                is UiState.Error -> {
                    UiComponents.toast(this, operation.message)
                    submitButton?.isEnabled = true
                    viewModel.resetOperation()
                }
                else -> Unit
            }
        }
    }

    private fun renderForm() {
        val root = UiComponents.base(this, if (editing) "Editar reporte" else "Nuevo reporte")
        root.addView(
            UiComponents.label(
                this,
                if (editing) {
                    "Solo puedes corregir tus reportes durante los primeros minutos."
                } else {
                    "Describe lo ocurrido. Puedes relacionarlo con una entrada o salida."
                }
            )
        )
        val subject = UiComponents.input(this, "Asunto").apply {
            setText(intent.getStringExtra(EXTRA_SUBJECT).orEmpty())
        }
        val body = ScreenParts.multilineInput(this, "Descripción del reporte").apply {
            setText(intent.getStringExtra(EXTRA_BODY).orEmpty())
        }
        val entryExit = UiComponents.input(this, "ID de entrada/salida (opcional)").apply {
            inputType = InputType.TYPE_CLASS_NUMBER
        }
        root.addView(subject)
        root.addView(body)
        if (!editing) root.addView(entryExit)

        val submit = UiComponents.button(this, if (editing) "Guardar cambios" else "Registrar reporte")
        submit.setOnClickListener {
            val subjectText = subject.text.toString().trim()
            val bodyText = body.text.toString().trim()
            if (subjectText.isEmpty() || bodyText.isEmpty()) {
                UiComponents.toast(this, "Completa el asunto y la descripción.")
                return@setOnClickListener
            }
            if (editing) {
                viewModel.update(token, reportId, subjectText, bodyText)
                return@setOnClickListener
            }
            val rawId = entryExit.text.toString().trim()
            val entryExitId = rawId.toIntOrNull()
            if (rawId.isNotEmpty() && entryExitId == null) {
                UiComponents.toast(this, "El ID de entrada/salida debe ser un número.")
                return@setOnClickListener
            }
            viewModel.create(token, subjectText, bodyText, entryExitId)
        }
        submitButton = submit
        root.addView(submit)
        root.addView(ScreenParts.secondaryButton(this, "Cancelar").apply {
            setOnClickListener { finish() }
        })
    }

    companion object {
        const val EXTRA_ID = "report_id"
        const val EXTRA_SUBJECT = "report_subject"
        const val EXTRA_BODY = "report_body"
    }
}
