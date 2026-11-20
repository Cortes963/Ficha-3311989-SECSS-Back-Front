package com.example.secss.data.repository

interface RepositoryCallback<T> {
    fun onSuccess(value: T)
    fun onError(message: String)
}
