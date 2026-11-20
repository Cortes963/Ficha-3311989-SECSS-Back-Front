package com.example.secss.data.repository


import com.example.secss.data.remote.SecssApiService
import org.json.JSONObject

class QuotaRepository(private val apiService: SecssApiService) {

    /** ADMINISTRADOR, JEFE y CELADOR: todos los cupos (auth_vehiculo). */
    fun getQuotas(token: String, callback: RepositoryCallback<PagedResult>) {
        apiService.request(
            method = "GET",
            path = "/quota?limite=100",
            token = token,
            callback = apiCallback(callback) { it.toPaged() }
        )
    }

    /** Cupo propio: { vehiculo, vehiculoEnParqueadero, idEntradaAbierta }. */
    fun getMyQuota(token: String, callback: RepositoryCallback<JSONObject>) {
        apiService.request(
            method = "GET",
            path = "/quota/me",
            token = token,
            callback = apiCallback(callback) { it }
        )
    }

    fun getQuotaDetail(
        token: String,
        userId: Int,
        vehicleId: Int,
        callback: RepositoryCallback<JSONObject>
    ) {
        apiService.request(
            method = "GET",
            path = "/quota/detalle/$userId/$vehicleId",
            token = token,
            callback = apiCallback(callback) { it.optJSONObject("datos") ?: JSONObject() }
        )
    }

    /** Solo ADMINISTRADOR. estado 1 habilita (y deshabilita los demás cupos del usuario); 0 deshabilita. */
    fun updateQuotaState(
        token: String,
        userId: Int,
        vehicleId: Int,
        estado: Int,
        callback: RepositoryCallback<String>
    ) {
        apiService.request(
            method = "PATCH",
            path = "/quota/$userId/$vehicleId",
            body = JSONObject().put("estado", estado),
            token = token,
            callback = apiCallback(callback) { it.optString("mensaje", "Cupo actualizado.") }
        )
    }
}
