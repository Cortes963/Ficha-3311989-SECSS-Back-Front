package com.example.secss.ui.common

import androidx.lifecycle.MutableLiveData
import com.example.secss.data.repository.RepositoryCallback

/** Estado genérico de una pantalla o de una operación contra la API. */
sealed interface UiState<out T> {
    data object Idle : UiState<Nothing>
    data object Loading : UiState<Nothing>
    data class Success<out T>(val data: T) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
}

/** Conecta un RepositoryCallback con un LiveData de UiState (los callbacks llegan en el hilo principal). */
fun <T> callbackTo(target: MutableLiveData<UiState<T>>): RepositoryCallback<T> =
    object : RepositoryCallback<T> {
        override fun onSuccess(value: T) {
            target.postValue(UiState.Success(value))
        }

        override fun onError(message: String) {
            target.postValue(UiState.Error(message))
        }
    }
