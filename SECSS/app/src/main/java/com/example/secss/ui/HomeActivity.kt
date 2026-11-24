package com.example.secss.ui

import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.widget.LinearLayout
import androidx.activity.ComponentActivity
import androidx.lifecycle.ViewModelProvider
import com.example.secss.SecssApplication
import com.example.secss.data.repository.AuthSession
import com.example.secss.ui.auth.AuthViewModel

class HomeActivity : ComponentActivity() {
    private lateinit var authViewModel: AuthViewModel
    private var role = ""

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val container = (application as SecssApplication).container
        authViewModel = ViewModelProvider(this, SecssViewModelFactory(container))
            .get(AuthViewModel::class.java)
        authViewModel.session.observe(this) { session ->
            if (session == null) {
                startActivity(Intent(this, LoginActivity::class.java))
                finish()
            } else {
                role = session.role
                renderHome(session)
            }
        }
    }

    private fun renderHome(session: AuthSession) {
        val root = UiComponents.base(this)
        val navy = UiComponents.secssNavy
        val brand = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = UiComponents.dp(this@HomeActivity, 18)
            setPadding(padding, padding, padding, padding)
            background = UiComponents.rounded(this@HomeActivity, navy, navy)
        }
        brand.addView(UiComponents.label(this, "SECSS").apply {
            textSize = 26f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
        })
        brand.addView(UiComponents.label(this, "Sistema de Gestión y Control Tecnológico · CEET").apply {
            setTextColor(Color.rgb(230, 240, 244))
        })
        root.addView(brand, LinearLayout.LayoutParams(-1, -2))
        root.addView(UiComponents.label(this, "Bienvenida, ${session.username.ifEmpty { "usuario" }}").apply {
            textSize = 20f
            setTypeface(null, Typeface.BOLD)
            setTextColor(navy)
            setPadding(0, UiComponents.dp(this@HomeActivity, 18), 0, UiComponents.dp(this@HomeActivity, 4))
        })
        root.addView(UiComponents.label(this, "Servicio de Estacionamiento del Complejo Sur SENA").apply {
            setTextColor(Color.rgb(80, 88, 92))
            setPadding(0, 0, 0, UiComponents.dp(this@HomeActivity, 18))
        })

        homeCard(root, "Vehículos", "Registra y consulta motos y bicicletas asociadas a tu cuenta SECSS.", "Abrir módulo Vehículos") {
            startActivity(Intent(this, VehicleActivity::class.java))
        }
        if (role != "ADMINISTRADOR") {
            val description = when {
                isOwnOnly() -> "Consulta tu historial de ingresos y salidas del complejo."
                role == "CELADOR" -> "Registra entradas, salidas e invitados y consulta el historial."
                else -> "Consulta los ingresos y salidas del complejo."
            }
            homeCard(root, "Entradas y salidas", description, "Abrir módulo Entradas y salidas") {
                startActivity(Intent(this, EntriesActivity::class.java))
            }
        }
        val quotaDescription = when {
            isOwnOnly() -> "Consulta el estado de tu cupo de parqueadero."
            role == "ADMINISTRADOR" -> "Consulta y habilita o deshabilita cupos."
            else -> "Consulta los cupos autorizados."
        }
        homeCard(root, "Cupos", quotaDescription, "Abrir módulo Cupos") {
            startActivity(Intent(this, QuotaActivity::class.java))
        }
        root.addView(UiComponents.button(this, "Cerrar sesión").apply {
            setOnClickListener { authViewModel.logout() }
        })
    }

    private fun homeCard(
        root: LinearLayout,
        title: String,
        description: String,
        action: String,
        onClick: () -> Unit
    ) {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val horizontal = UiComponents.dp(this@HomeActivity, 18)
            setPadding(horizontal, UiComponents.dp(this@HomeActivity, 16), horizontal, UiComponents.dp(this@HomeActivity, 16))
            background = UiComponents.rounded(this@HomeActivity, Color.WHITE, Color.rgb(220, 226, 229))
        }
        root.addView(card, LinearLayout.LayoutParams(-1, -2).apply {
            setMargins(0, UiComponents.dp(this@HomeActivity, 10), 0, 0)
        })
        card.addView(UiComponents.label(this, title).apply {
            textSize = 20f
            setTypeface(null, Typeface.BOLD)
            setTextColor(UiComponents.secssNavy)
        })
        card.addView(UiComponents.label(this, description))
        card.addView(UiComponents.button(this, action).apply { setOnClickListener { onClick() } })
    }

    private fun isOwnOnly() = role == "APRENDIZ" || role == "INVITADO"
}
