package com.example.secss.ui.inputoutput

import android.net.Uri
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.example.secss.data.repository.GuestResult
import com.example.secss.data.repository.InputOutputRepository
import com.example.secss.data.repository.PagedResult
import com.example.secss.ui.common.UiState
import com.example.secss.ui.common.callbackTo
import org.json.JSONObject

class InputOutputViewModel(private val repository: InputOutputRepository) : ViewModel() {
    private val mutableListState = MutableLiveData<UiState<PagedResult>>(UiState.Idle)
    val listState: LiveData<UiState<PagedResult>> = mutableListState

    private val mutableDetailState = MutableLiveData<UiState<JSONObject>>(UiState.Idle)
    val detailState: LiveData<UiState<JSONObject>> = mutableDetailState

    private val mutableOperationState = MutableLiveData<UiState<String>>(UiState.Idle)
    val operationState: LiveData<UiState<String>> = mutableOperationState

    private val mutableGuestState = MutableLiveData<UiState<GuestResult>>(UiState.Idle)
    val guestState: LiveData<UiState<GuestResult>> = mutableGuestState

    fun loadEntries(token: String, ownOnly: Boolean, estado: String) {
        mutableListState.value = UiState.Loading
        repository.getEntries(token, ownOnly, estado, callbackTo(mutableListState))
    }

    fun loadDetail(token: String, id: Int) {
        mutableDetailState.value = UiState.Loading
        repository.getEntry(token, id, callbackTo(mutableDetailState))
    }

    fun registerEntry(token: String, userId: Int, vehicleId: Int) {
        mutableOperationState.value = UiState.Loading
        repository.registerEntry(token, userId, vehicleId, callbackTo(mutableOperationState))
    }

    fun registerExit(token: String, id: Int) {
        mutableOperationState.value = UiState.Loading
        repository.registerExit(token, id, callbackTo(mutableOperationState))
    }

    fun registerGuest(token: String, payload: JSONObject, images: Map<String, Uri>) {
        mutableGuestState.value = UiState.Loading
        repository.registerGuest(token, payload, images, callbackTo(mutableGuestState))
    }

    fun resetOperation() {
        mutableOperationState.value = UiState.Idle
    }

    fun resetGuest() {
        mutableGuestState.value = UiState.Idle
    }
}
