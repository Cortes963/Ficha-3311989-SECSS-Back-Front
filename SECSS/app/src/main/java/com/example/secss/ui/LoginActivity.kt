package com.example.secss.ui

import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.inputmethod.InputMethodManager
import android.content.Context
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import androidx.activity.ComponentActivity
import androidx.lifecycle.ViewModelProvider
import com.example.secss.SecssApplication
import com.example.secss.ui.auth.AuthViewModel
import com.example.secss.ui.auth.LoginState

class LoginActivity : ComponentActivity() {
    private lateinit var authViewModel: AuthViewModel
    private lateinit var documentField: EditText
    private lateinit var passwordField: EditText
    private lateinit var loginButton: android.widget.Button

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val container = (application as SecssApplication).container
        authViewModel = ViewModelProvider(this, SecssViewModelFactory(container))
            .get(AuthViewModel::class.java)

        authViewModel.session.observe(this) { session ->
            if (session != null) {
                startActivity(android.content.Intent(this, HomeActivity::class.java))
                finish()
            }
        }
        if (authViewModel.session.value == null) {
            renderLogin()
            authViewModel.loginState.observe(this) { state ->
                when (state) {
                    LoginState.Loading -> {
                        loginButton.isEnabled = false
                        loginButton.text = "Conectando…"
                    }
                    is LoginState.Error -> {
                        loginButton.isEnabled = true
                        loginButton.text = "Ingresar"
                        UiComponents.toast(this, state.message)
                        authViewModel.resetLoginState()
                    }
                    LoginState.Success -> authViewModel.resetLoginState()
                    else -> Unit
                }
            }
        }
    }

    private fun renderLogin() {
        val root = UiComponents.base(this)
        val navy = UiComponents.secssNavy
        val cover = ImageView(this).apply {
            setImageResource(com.example.secss.R.drawable.secss_cover)
            scaleType = ImageView.ScaleType.FIT_CENTER
            contentDescription = "Portada SECSS SENA Parqueadero"
            background = UiComponents.rounded(this@LoginActivity, navy, navy)
            val padding = UiComponents.dp(this@LoginActivity, 8)
            setPadding(padding, padding, padding, padding)
        }
        root.addView(cover, LinearLayout.LayoutParams(-1, UiComponents.dp(this, 205)))
        root.addView(UiComponents.label(this, "Bienvenidos a SECSS").apply {
            textSize = 24f
            setTypeface(null, Typeface.BOLD)
            setTextColor(navy)
            gravity = Gravity.CENTER
            setPadding(0, UiComponents.dp(this@LoginActivity, 14), 0, UiComponents.dp(this@LoginActivity, 2))
        })
        root.addView(UiComponents.label(this, "Servicio de Estacionamiento del Complejo Sur SENA").apply {
            gravity = Gravity.CENTER
            setTextColor(Color.rgb(80, 88, 92))
            setPadding(0, 0, 0, UiComponents.dp(this@LoginActivity, 16))
        })

        val loginCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = UiComponents.dp(this@LoginActivity, 18)
            setPadding(padding, UiComponents.dp(this@LoginActivity, 16), padding, padding)
            background = UiComponents.rounded(this@LoginActivity, Color.WHITE, Color.rgb(220, 226, 229))
        }
        root.addView(loginCard, LinearLayout.LayoutParams(-1, -2))
        loginCard.addView(UiComponents.label(this, "Iniciar sesión").apply {
            textSize = 20f
            setTypeface(null, Typeface.BOLD)
            setTextColor(navy)
        })
        documentField = UiComponents.input(this, "Número de documento").apply { inputType = 2 }
        loginCard.addView(documentField)
        passwordField = UiComponents.input(this, "Contraseña").apply { inputType = 129 }
        loginCard.addView(passwordField)
        loginButton = UiComponents.button(this, "Ingresar")
        loginCard.addView(loginButton)
        loginButton.setOnClickListener {
            val document = documentField.text.toString().trim()
            val password = passwordField.text.toString()
            if (document.isEmpty() || password.isEmpty()) {
                UiComponents.toast(this, "Ingresa tu documento y contraseña.")
                return@setOnClickListener
            }
            val manager = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            manager.hideSoftInputFromWindow(root.windowToken, 0)
            authViewModel.login(document, password)
        }
    }
}
