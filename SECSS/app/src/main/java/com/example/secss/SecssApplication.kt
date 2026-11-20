package com.example.secss

import android.app.Application
import com.example.secss.data.local.TokenManager
import com.example.secss.data.remote.SecssApiService
import com.example.secss.data.repository.AuthRepository
import com.example.secss.data.repository.InputOutputRepository
import com.example.secss.data.repository.QuotaRepository
import com.example.secss.data.repository.VehicleRepository

class SecssApplication : Application() {
    val container: AppContainer by lazy { AppContainer(this) }
}

class AppContainer(application: Application) {
    private val apiService = SecssApiService(application)
    val tokenManager = TokenManager(application)
    val authRepository = AuthRepository(apiService)
    val vehicleRepository = VehicleRepository(apiService)
    val inputOutputRepository = InputOutputRepository(apiService)
    val quotaRepository = QuotaRepository(apiService)
}

