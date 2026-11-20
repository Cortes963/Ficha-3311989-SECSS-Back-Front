package com.example.secss.data.remote

import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.DataOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.util.concurrent.Executors

interface ApiCallback {
    fun onSuccess(response: JSONObject)
    fun onFailure(message: String)
}

class SecssApiService(context: Context) {
    private val contentResolver = context.contentResolver
    private val io = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    fun request(
        method: String,
        path: String,
        body: JSONObject? = null,
        token: String? = null,
        files: Map<String, Uri> = emptyMap(),
        callback: ApiCallback
    ) {
        io.execute {
            var connection: HttpURLConnection? = null
            try {
                connection = URL(apiBase() + path).openConnection() as HttpURLConnection
                connection.requestMethod = method
                connection.connectTimeout = 10_000
                connection.readTimeout = 15_000
                connection.setRequestProperty("Accept", "application/json")
                if (!token.isNullOrEmpty()) {
                    connection.setRequestProperty("Authorization", "Bearer $token")
                }

                if (body != null) {
                    connection.doOutput = true
                    if (files.isNotEmpty()) {
                        val boundary = "SECSS-${System.currentTimeMillis()}"
                        connection.setRequestProperty(
                            "Content-Type",
                            "multipart/form-data; boundary=$boundary"
                        )
                        DataOutputStream(connection.outputStream).use { output ->
                            val keys = body.keys()
                            while (keys.hasNext()) {
                                val key = keys.next()
                                writeField(output, boundary, key, body.optString(key))
                            }
                            files.forEach { (name, uri) ->
                                writeFile(output, boundary, name, uri)
                            }
                            output.writeBytes("--$boundary--\r\n")
                        }
                    } else {
                        connection.setRequestProperty(
                            "Content-Type",
                            "application/json; charset=utf-8"
                        )
                        connection.outputStream.use { output ->
                            output.write(body.toString().toByteArray(StandardCharsets.UTF_8))
                        }
                    }
                }

                val status = connection.responseCode
                val responseText = read(
                    if (status < HttpURLConnection.HTTP_BAD_REQUEST) {
                        connection.inputStream
                    } else {
                        connection.errorStream
                    }
                )
                val response = if (responseText.isBlank()) JSONObject() else JSONObject(responseText)

                mainHandler.post {
                    if (status in 200..299) {
                        callback.onSuccess(response)
                    } else {
                        callback.onFailure(
                            response.optString("mensaje", "Error de conexión ($status).")
                        )
                    }
                }
            } catch (exception: Exception) {
                mainHandler.post {
                    callback.onFailure(
                        "No se pudo conectar con SECSS en el puerto 4001. " +
                            "Comprueba que el backend esté activo."
                    )
                }
            } finally {
                connection?.disconnect()
            }
        }
    }

    private fun writeField(
        output: DataOutputStream,
        boundary: String,
        name: String,
        value: String
    ) {
        output.writeUtf8("--$boundary\r\n")
        output.writeUtf8("Content-Disposition: form-data; name=\"$name\"\r\n\r\n")
        output.writeUtf8("$value\r\n")
    }

    private fun writeFile(
        output: DataOutputStream,
        boundary: String,
        name: String,
        uri: Uri
    ) {
        val mimeType = contentResolver.getType(uri) ?: "application/octet-stream"
        val fileName = displayName(uri).replace("\"", "").replace("\r", "").replace("\n", "")
        output.writeUtf8("--$boundary\r\n")
        output.writeUtf8(
            "Content-Disposition: form-data; name=\"$name\"; filename=\"$fileName\"\r\n"
        )
        output.writeUtf8("Content-Type: $mimeType\r\n\r\n")
        contentResolver.openInputStream(uri).use { input ->
            requireNotNull(input) { "No se pudo abrir la imagen seleccionada." }
            input.copyTo(output)
        }
        output.writeUtf8("\r\n")
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

    private fun read(input: InputStream?): String {
        if (input == null) return ""
        return input.use {
            val bytes = ByteArrayOutputStream()
            it.copyTo(bytes)
            bytes.toString("UTF-8")
        }
    }

    private fun DataOutputStream.writeUtf8(value: String) {
        write(value.toByteArray(StandardCharsets.UTF_8))
    }

    private fun apiBase(): String {
        val emulator = Build.FINGERPRINT.startsWith("generic") ||
            Build.MODEL.contains("Emulator") ||
            Build.HARDWARE.contains("ranchu")
        return if (emulator) "http://10.0.2.2:4001/api" else "http://127.0.0.1:4001/api"
    }
}
