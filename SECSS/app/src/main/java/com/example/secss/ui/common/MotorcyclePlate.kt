package com.example.secss.ui.common

object MotorcyclePlate {
    private val pattern = Regex("^[A-Z]{3}\\d{2}[A-Z0-9]$")

    fun isValid(value: String): Boolean = pattern.matches(value.trim().uppercase())
}
