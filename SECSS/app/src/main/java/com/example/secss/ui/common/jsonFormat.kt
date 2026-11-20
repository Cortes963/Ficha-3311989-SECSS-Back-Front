package com.example.secss.ui.common

import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/** optString de org.json devuelve "null" cuando el valor es JSON null; esto lo evita. */
fun JSONObject.str(key: String, fallback: String = "—"): String {
    if (!has(key) || isNull(key)) return fallback
    return optString(key, fallback).ifEmpty { fallback }
}

/** El backend serializa los DATETIME como ISO en UTC (…Z); se muestran en la hora local del teléfono. */
fun JSONObject.dateTime(key: String): String {
    val raw = str(key, "")
    if (raw.length < 19) return raw.ifEmpty { "—" }
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
        parser.timeZone = TimeZone.getTimeZone("UTC")
        val parsed = parser.parse(raw.substring(0, 19))
        if (parsed == null) raw else SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(parsed)
    } catch (exception: Exception) {
        raw
    }
}

/** Fechas tipo DATE (fecha_vinculacion, fecha_terminacion) como dd/MM/yyyy. */
fun JSONObject.day(key: String): String {
    val raw = str(key)
    return if (raw.length >= 10 && raw[4] == '-') {
        raw.substring(8, 10) + "/" + raw.substring(5, 7) + "/" + raw.substring(0, 4)
    } else {
        raw
    }
}
