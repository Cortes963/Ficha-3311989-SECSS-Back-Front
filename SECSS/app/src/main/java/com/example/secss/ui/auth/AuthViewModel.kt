package com.example.secss.ui.auth

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.example.secss.data.local.TokenManager
import com.example.secss.data.repository.AuthRepository
import com.example.secss.data.repository.AuthSession
import com.example.secss.data.repository.RepositoryCallback

sealed interface LoginState {
    data object Idle : LoginState
    data object Loading : LoginState
    data object Success : LoginState
    data class Error(val message: String) : LoginState
}

class AuthViewModel(
    private val repository: AuthRepository,
    private val tokenManager: TokenManager
) : ViewModel() {
    private val mutableSession = MutableLiveData(tokenManager.getSession())
    val session: LiveData<AuthSession?> = mutableSession

    private val mutableLoginState = MutableLiveData<LoginState>(LoginState.Idle)
    val loginState: LiveData<LoginState> = mutableLoginState

    fun login(document: String, password: String) {
        mutableLoginState.value = LoginState.Loading
        repository.login(document, password, object : RepositoryCallback<AuthSession> {
            override fun onSuccess(value: AuthSession) {
                tokenManager.saveSession(value)
                mutableSession.postValue(value)
                mutableLoginState.postValue(LoginState.Success)
            }

            override fun onError(message: String) {
                mutableLoginState.postValue(LoginState.Error(message))
            }
        })
    }

    fun logout() {
        tokenManager.clearSession()
        mutableSession.value = null
        mutableLoginState.value = LoginState.Idle
    }

    fun resetLoginState() {
        mutableLoginState.value = LoginState.Idle
    }
}
