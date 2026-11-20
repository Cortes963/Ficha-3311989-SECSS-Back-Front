package com.example.secss.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.secss.AppContainer
import com.example.secss.ui.auth.AuthViewModel
import com.example.secss.ui.inputoutput.InputOutputViewModel
import com.example.secss.ui.quota.QuotaViewModel
import com.example.secss.ui.vehicle.VehicleViewModel

class SecssViewModelFactory(
    private val container: AppContainer
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = when {
        modelClass.isAssignableFrom(AuthViewModel::class.java) ->
            AuthViewModel(container.authRepository, container.tokenManager) as T
        modelClass.isAssignableFrom(VehicleViewModel::class.java) ->
            VehicleViewModel(container.vehicleRepository) as T
        modelClass.isAssignableFrom(InputOutputViewModel::class.java) ->
            InputOutputViewModel(container.inputOutputRepository) as T
        modelClass.isAssignableFrom(QuotaViewModel::class.java) ->
            QuotaViewModel(container.quotaRepository) as T
        else -> throw IllegalArgumentException("ViewModel no reconocido: ${modelClass.name}")
    }
}
