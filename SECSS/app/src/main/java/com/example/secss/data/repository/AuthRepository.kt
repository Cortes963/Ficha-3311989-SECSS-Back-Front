package com.example.secss.data.repository

import com.example.secss.data.remote.ApiCallback
import com.example.secss.data.remote.SecssApiService
import org.json.JSONArray
import org.json.JSONObject

data class AuthSession(
    val token: String,
    val role: String,
    val username: String
)

class AuthRepository(private val apiService: SecssApiService) {
    fun login(
        document: String,
        password: String,
        callback: RepositoryCallback<AuthSession>
    ) {
        val body = JSONObject()
            .put("numero_documento", document)
            .put("password", password)

        apiService.request(
            method = "POST",
            path = "/auth/storeAuthLogin",
            body = body,
            callback = object : ApiCallback {
                override fun onSuccess(response: JSONObject) {
                    val token = response.optString("token")
                    val user = response.optJSONObject("usuario")
                    if (token.isBlank() || user == null) {
                        callback.onError("Respuesta de inicio de sesión no válida.")
                        return
                    }
                    val roles: JSONArray? = user.optJSONArray("roles")
                    callback.onSuccess(
                        AuthSession(
                            token = token,
                            role = roles?.takeIf { it.length() > 0 }?.optString(0).orEmpty(),
                            username = user.optString("nombre", "Usuario SECSS")
                        )
                    )
                }

                override fun onFailure(message: String) = callback.onError(message)
            }
        )
    }
}
