package com.example.secss.ui.quota

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.example.secss.data.repository.PagedResult
import com.example.secss.data.repository.QuotaRepository
import com.example.secss.ui.common.UiState
import com.example.secss.ui.common.callbackTo
import org.json.JSONObject

class QuotaViewModel(private val repository: QuotaRepository) : ViewModel() {
    private val mutableListState = MutableLiveData<UiState<PagedResult>>(UiState.Idle)
    val listState: LiveData<UiState<PagedResult>> = mutableListState

    private val mutableMyQuotaState = MutableLiveData<UiState<JSONObject>>(UiState.Idle)
    val myQuotaState: LiveData<UiState<JSONObject>> = mutableMyQuotaState

    private val mutableDetailState = MutableLiveData<UiState<JSONObject>>(UiState.Idle)
    val detailState: LiveData<UiState<JSONObject>> = mutableDetailState

    private val mutableOperationState = MutableLiveData<UiState<String>>(UiState.Idle)
    val operationState: LiveData<UiState<String>> = mutableOperationState

    fun loadQuotas(token: String) {
        mutableListState.value = UiState.Loading
        repository.getQuotas(token, callbackTo(mutableListState))
    }

    fun loadMyQuota(token: String) {
        mutableMyQuotaState.value = UiState.Loading
        repository.getMyQuota(token, callbackTo(mutableMyQuotaState))
    }

    fun loadDetail(token: String, userId: Int, vehicleId: Int) {
        mutableDetailState.value = UiState.Loading
        repository.getQuotaDetail(token, userId, vehicleId, callbackTo(mutableDetailState))
    }

    fun updateState(token: String, userId: Int, vehicleId: Int, enabled: Boolean) {
        mutableOperationState.value = UiState.Loading
        repository.updateQuotaState(
            token,
            userId,
            vehicleId,
            if (enabled) 1 else 0,
            callbackTo(mutableOperationState)
        )
    }

    fun resetOperation() {
        mutableOperationState.value = UiState.Idle
    }
}
