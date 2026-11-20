package com.example.secss.data.repository

import com.example.secss.data.remote.ApiCallback
import org.json.JSONArray
import org.json.JSONObject

/** Listado paginado del backend: { ok, pagina, limite, total, datos: [...] }. */
data class PagedResult(val rows: JSONArray, val total: Int)

internal fun JSONObject.toPaged(): PagedResult {
    val rows = optJSONArray("datos") ?: JSONArray()
    return PagedResult(rows, optInt("total", rows.length()))
}

internal fun <T> apiCallback(
    callback: RepositoryCallback<T>,
    map: (JSONObject) -> T
): ApiCallback = object : ApiCallback {
    override fun onSuccess(response: JSONObject) {
        callback.onSuccess(map(response))
    }

    override fun onFailure(message: String) {
        callback.onError(message)
    }
}
