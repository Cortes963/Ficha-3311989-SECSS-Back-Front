package com.example.secss.data.local

import android.content.Context
import com.example.secss.data.repository.AuthSession

class TokenManager(context: Context) {
    private val preferences =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun getSession(): AuthSession? {
        val token = preferences.getString(TOKEN_KEY, "").orEmpty()
        if (token.isBlank()) return null

        return AuthSession(
            token = token,
            role = preferences.getString(ROLE_KEY, "").orEmpty(),
            username = preferences.getString(USERNAME_KEY, "").orEmpty()
        )
    }

    fun saveSession(session: AuthSession) {
        preferences.edit()
            .putString(TOKEN_KEY, session.token)
            .putString(ROLE_KEY, session.role)
            .putString(USERNAME_KEY, session.username)
            .apply()
    }

    fun clearSession() {
        preferences.edit().clear().apply()
    }

    private companion object {
        const val PREFERENCES_NAME = "secss_session"
        const val TOKEN_KEY = "token"
        const val ROLE_KEY = "role"
        const val USERNAME_KEY = "username"
    }
}
