package com.example.secss.data.repository

import android.net.Uri
import com.example.secss.data.remote.ApiCallback
import com.example.secss.data.remote.SecssApiService
import org.json.JSONArray
import org.json.JSONObject

class VehicleRepository(private val apiService: SecssApiService) {
    fun getMyVehicles(token: String, callback: RepositoryCallback<JSONArray>) {
        apiService.request(
            method = "GET",
            path = "/vehicle/me",
            token = token,
            callback = object : ApiCallback {
                override fun onSuccess(response: JSONObject) {
                    callback.onSuccess(response.optJSONArray("datos") ?: JSONArray())
                }

                override fun onFailure(message: String) = callback.onError(message)
            }
        )
    }

    fun saveVehicle(
        id: Int?,
        payload: JSONObject,
        token: String,
        images: Map<String, Uri>,
        callback: RepositoryCallback<String>
    ) {
        apiService.request(
            method = if (id == null) "POST" else "PATCH",
            path = if (id == null) "/vehicle" else "/vehicle/$id",
            body = payload,
            token = token,
            files = images,
            callback = messageCallback("Vehículo guardado.", callback)
        )
    }

    fun deleteVehicle(
        id: Int,
        token: String,
        callback: RepositoryCallback<String>
    ) {
        apiService.request(
            method = "PATCH",
            path = "/vehicle/$id/inactivar",
            token = token,
            callback = messageCallback("Vehículo retirado.", callback)
        )
    }

    private fun messageCallback(
        defaultMessage: String,
        callback: RepositoryCallback<String>
    ) = object : ApiCallback {
        override fun onSuccess(response: JSONObject) {
            callback.onSuccess(response.optString("mensaje", defaultMessage))
        }

        override fun onFailure(message: String) = callback.onError(message)
    }
}
