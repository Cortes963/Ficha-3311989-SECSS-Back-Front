package com.example.secss.data.repository

import android.net.Uri
import com.example.secss.data.remote.SecssApiService
import org.json.JSONObject

data class GuestResult(val message: String, val email: String?, val password: String?)

class InputOutputRepository(private val apiService: SecssApiService) {

    /** APRENDIZ/INVITADO usan /input_output/me; JEFE y CELADOR usan /input_output. estado: "", DENTRO o FUERA. */
    fun getEntries(
        token: String,
        ownOnly: Boolean,
        estado: String,
        callback: RepositoryCallback<PagedResult>
    ) {
        val base = if (ownOnly) "/input_output/me" else "/input_output"
        val filter = if (estado.isEmpty()) "" else "&estado=$estado"
        apiService.request(
            method = "GET",
            path = "$base?limite=50$filter",
            token = token,
            callback = apiCallback(callback) { it.toPaged() }
        )
    }

    fun getEntry(token: String, id: Int, callback: RepositoryCallback<JSONObject>) {
        apiService.request(
            method = "GET",
            path = "/input_output/$id",
            token = token,
            callback = apiCallback(callback) { it.optJSONObject("datos") ?: JSONObject() }
        )
    }

    /** Solo CELADOR. El backend exige un cupo activo y rechaza (409) si ya hay una entrada abierta. */
    fun registerEntry(
        token: String,
        userId: Int,
        vehicleId: Int,
        callback: RepositoryCallback<String>
    ) {
        val body = JSONObject()
            .put("id_usuario_entra", userId)
            .put("id_vehiculo", vehicleId)
        apiService.request(
            method = "POST",
            path = "/input_output/entrada",
            body = body,
            token = token,
            callback = apiCallback(callback) {
                it.optString("mensaje", "Entrada registrada correctamente.")
            }
        )
    }

    /** Solo CELADOR. Se envía "{}" porque SecssApiService solo escribe cuerpo cuando body != null. */
    fun registerExit(token: String, id: Int, callback: RepositoryCallback<String>) {
        apiService.request(
            method = "PATCH",
            path = "/input_output/salida/$id",
            body = JSONObject(),
            token = token,
            callback = apiCallback(callback) {
                it.optString("mensaje", "Salida registrada correctamente.")
            }
        )
    }

    /** Solo CELADOR: alta de invitado nuevo + vehículo + entrada. Las imágenes son opcionales. */
    fun registerGuest(
        token: String,
        payload: JSONObject,
        images: Map<String, Uri>,
        callback: RepositoryCallback<GuestResult>
    ) {
        apiService.request(
            method = "POST",
            path = "/input_output/invitado",
            body = payload,
            token = token,
            files = images,
            callback = apiCallback(callback) { response ->
                val credentials = response.optJSONObject("credenciales_temporales")
                GuestResult(
                    message = response.optString("mensaje", "Invitado registrado."),
                    email = credentials?.optString("correo"),
                    password = credentials?.optString("password")
                )
            }
        )
    }
}
