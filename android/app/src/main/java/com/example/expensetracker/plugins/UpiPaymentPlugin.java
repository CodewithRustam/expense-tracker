package com.example.expensetracker.plugins;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashMap;
import java.util.Map;

/**
 * Capacitor plugin to trigger Android UPI payment intents and auto-capture the response.
 *
 * Usage from JavaScript:
 *   UpiPayment.startPayment({ am: "500.00", cu: "INR", tn: "Settlement for Aug", tr: "SPLITX-12345" })
 *
 * The plugin omits the payee VPA (pa=) so the user selects/enters the payee inside their UPI app.
 * The UTR (txnRef) is still auto-captured from the OS-level response.
 */
@CapacitorPlugin(name = "UpiPayment")
public class UpiPaymentPlugin extends Plugin {

    @PluginMethod
    public void startPayment(PluginCall call) {
        // Build the UPI URI — no pa= (payee) so user picks inside the UPI app
        String amount = call.getString("am", "");
        String currency = call.getString("cu", "INR");
        String note = call.getString("tn", "");
        String transactionRef = call.getString("tr", "");

        Uri.Builder uriBuilder = new Uri.Builder()
                .scheme("upi")
                .authority("pay");

        // Only add non-empty params
        if (amount != null && !amount.isEmpty()) {
            uriBuilder.appendQueryParameter("am", amount);
        }
        if (currency != null && !currency.isEmpty()) {
            uriBuilder.appendQueryParameter("cu", currency);
        }
        if (note != null && !note.isEmpty()) {
            uriBuilder.appendQueryParameter("tn", note);
        }
        if (transactionRef != null && !transactionRef.isEmpty()) {
            uriBuilder.appendQueryParameter("tr", transactionRef);
        }

        // If a payee VPA is provided (future-proofing), include it
        String payeeVpa = call.getString("pa", "");
        if (payeeVpa != null && !payeeVpa.isEmpty()) {
            uriBuilder.appendQueryParameter("pa", payeeVpa);
        }

        // If a payee name is provided (future-proofing), include it
        String payeeName = call.getString("pn", "");
        if (payeeName != null && !payeeName.isEmpty()) {
            uriBuilder.appendQueryParameter("pn", payeeName);
        }

        Uri upiUri = uriBuilder.build();

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setData(upiUri);

        try {
            startActivityForResult(call, intent, "upiPaymentResult");
        } catch (ActivityNotFoundException e) {
            call.reject("No UPI app found on this device. Please install Google Pay, PhonePe, or another UPI app.", "NO_UPI_APP");
        }
    }

    /**
     * Callback invoked when the UPI app returns control to our app.
     * The response is a query-string formatted string in the intent extras:
     *   Status=SUCCESS&txnId=ABC123&txnRef=UTR456&ApprovalRefNo=789
     */
    @ActivityCallback
    private void upiPaymentResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        int resultCode = result.getResultCode();
        Intent data = result.getData();

        // User pressed back / cancelled
        if (resultCode == Activity.RESULT_CANCELED) {
            JSObject ret = new JSObject();
            ret.put("status", "CANCELLED");
            ret.put("txnRef", "");
            ret.put("txnId", "");
            ret.put("approvalRefNo", "");
            ret.put("rawResponse", "");
            call.resolve(ret);
            return;
        }

        // Extract the response string from the intent
        String responseStr = "";
        if (data != null) {
            responseStr = data.getStringExtra("response");
        }

        if (responseStr == null || responseStr.isEmpty()) {
            // Some UPI apps don't return a response string
            JSObject ret = new JSObject();
            ret.put("status", "UNKNOWN");
            ret.put("txnRef", "");
            ret.put("txnId", "");
            ret.put("approvalRefNo", "");
            ret.put("rawResponse", "");
            call.resolve(ret);
            return;
        }

        // Parse the response: "Status=SUCCESS&txnId=ABC&txnRef=UTR123&ApprovalRefNo=456"
        Map<String, String> parsed = parseUpiResponse(responseStr);

        JSObject ret = new JSObject();
        ret.put("status", getValueOrEmpty(parsed, "Status"));
        ret.put("txnRef", getValueOrEmpty(parsed, "txnRef"));
        ret.put("txnId", getValueOrEmpty(parsed, "txnId"));
        ret.put("approvalRefNo", getValueOrEmpty(parsed, "ApprovalRefNo"));
        ret.put("rawResponse", responseStr);
        call.resolve(ret);
    }

    /**
     * Parses a UPI response query string into a key-value map.
     * Example input: "Status=SUCCESS&txnId=ABC123&txnRef=UTR456"
     */
    private Map<String, String> parseUpiResponse(String response) {
        Map<String, String> map = new HashMap<>();
        if (response == null || response.isEmpty()) {
            return map;
        }
        String[] pairs = response.split("&");
        for (String pair : pairs) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2) {
                map.put(kv[0].trim(), kv[1].trim());
            } else if (kv.length == 1) {
                map.put(kv[0].trim(), "");
            }
        }
        return map;
    }

    private String getValueOrEmpty(Map<String, String> map, String key) {
        // Try exact key first, then case-insensitive fallback
        if (map.containsKey(key)) {
            return map.get(key);
        }
        for (Map.Entry<String, String> entry : map.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(key)) {
                return entry.getValue();
            }
        }
        return "";
    }
}
