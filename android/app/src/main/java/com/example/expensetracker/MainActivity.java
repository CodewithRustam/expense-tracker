package com.example.expensetracker;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.example.expensetracker.plugins.UpiPaymentPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UpiPaymentPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
