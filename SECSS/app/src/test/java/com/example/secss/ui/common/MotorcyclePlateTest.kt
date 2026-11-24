package com.example.secss.ui.common

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MotorcyclePlateTest {
    @Test
    fun acceptsLettersOrDigitAtTheEnd() {
        assertTrue(MotorcyclePlate.isValid("ABC12G"))
        assertTrue(MotorcyclePlate.isValid("ABC12D"))
        assertTrue(MotorcyclePlate.isValid("ABC120"))
    }

    @Test
    fun normalizesSurroundingWhitespaceAndCase() {
        assertTrue(MotorcyclePlate.isValid(" abc12d "))
    }

    @Test
    fun rejectsMalformedPlates() {
        assertFalse(MotorcyclePlate.isValid("AB12D"))
        assertFalse(MotorcyclePlate.isValid("ABC1234"))
        assertFalse(MotorcyclePlate.isValid("ABC 12D"))
    }
}
