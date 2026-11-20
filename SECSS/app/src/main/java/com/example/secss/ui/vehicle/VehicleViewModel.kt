package com.example.secss.ui.vehicle

import android.net.Uri
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.example.secss.data.repository.RepositoryCallback
import com.example.secss.data.repository.VehicleRepository
import org.json.JSONArray
import org.json.JSONObject

sealed interface VehicleListState {
    data object Idle : VehicleListState
    data object Loading : VehicleListState
    data class Loaded(val vehicles: JSONArray) : VehicleListState
    data class Error(val message: String) : VehicleListState
}

sealed interface VehicleOperationState {
    data object Idle : VehicleOperationState
    data object Loading : VehicleOperationState
    data class Success(val message: String) : VehicleOperationState
    data class Error(val message: String) : VehicleOperationState
}

class VehicleViewModel(private val repository: VehicleRepository) : ViewModel() {
    private val mutableListState = MutableLiveData<VehicleListState>(VehicleListState.Idle)
    val listState: LiveData<VehicleListState> = mutableListState

    private val mutableOperationState =
        MutableLiveData<VehicleOperationState>(VehicleOperationState.Idle)
    val operationState: LiveData<VehicleOperationState> = mutableOperationState

    private var activeToken = ""

    fun loadVehicles(token: String) {
        activeToken = token
        mutableListState.value = VehicleListState.Loading
        repository.getMyVehicles(token, object : RepositoryCallback<JSONArray> {
            override fun onSuccess(value: JSONArray) {
                mutableListState.postValue(VehicleListState.Loaded(value))
            }

            override fun onError(message: String) {
                mutableListState.postValue(VehicleListState.Error(message))
            }
        })
    }

    fun saveVehicle(
        id: Int?,
        payload: JSONObject,
        images: Map<String, Uri>
    ) {
        mutableOperationState.value = VehicleOperationState.Loading
        repository.saveVehicle(
            id,
            payload,
            activeToken,
            images,
            object : RepositoryCallback<String> {
                override fun onSuccess(value: String) {
                    mutableOperationState.postValue(VehicleOperationState.Success(value))
                }

                override fun onError(message: String) {
                    mutableOperationState.postValue(VehicleOperationState.Error(message))
                }
            }
        )
    }

    fun deleteVehicle(id: Int) {
        mutableOperationState.value = VehicleOperationState.Loading
        repository.deleteVehicle(id, activeToken, object : RepositoryCallback<String> {
            override fun onSuccess(value: String) {
                mutableOperationState.postValue(VehicleOperationState.Success(value))
            }

            override fun onError(message: String) {
                mutableOperationState.postValue(VehicleOperationState.Error(message))
            }
        })
    }

    fun resetOperationState() {
        mutableOperationState.value = VehicleOperationState.Idle
    }
}
