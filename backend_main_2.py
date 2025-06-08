from flask import Flask, jsonify
from supabase import create_client
from xrpl.wallet import generate_faucet_wallet
from xrpl.clients import JsonRpcClient
from xrpl.models.requests import AccountTx

from flask import request
from dateutil import parser
from datetime import datetime, timezone
import traceback
import uuid
import requests

# Supabase connection
url = "https://wacicyiidaysfjdiaeim.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhY2ljeWlpZGF5c2ZqZGlhZWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0OTA5NDUsImV4cCI6MjA2MzA2Njk0NX0.6FpJppdFQNPkmd6dBxsShPbLtLYe0LAS2YrsN84LTUI"    # Your anon/public API key
supabase = create_client(url, key)

# XRPL Testnet client
XRPL_TESTNET_URL = "https://s.altnet.rippletest.net:51234"
xrpl_client = JsonRpcClient(XRPL_TESTNET_URL)

# Flask app
app = Flask(__name__)

@app.route("/create_wallet", methods=["POST"])
def create_wallet():
    try:
        # Create new testnet wallet
        wallet = generate_faucet_wallet(xrpl_client, debug=True)

        wallet_data = {
            "classic_address": wallet.classic_address,
            "public_key": wallet.public_key,
            "private_key": wallet.private_key,
            "seed": wallet.seed,
        }

        # Optional: store to Supabase if needed
        # supabase.table("wallets").insert(wallet_data).execute()

        return jsonify({
            "status": "success",
            "wallet": wallet_data
        }), 200

    except Exception as e:
        print("Wallet creation failed:", traceback.format_exc())
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 404


# ---------- Helper Functions ---------- #

def get_demand_from_xrpl_wallet(classic_address, client: JsonRpcClient):
    print(f"[XRPL QUERY] Fetching transactions for wallet: {classic_address}")
    try:
        payment_count = 0
        marker = None
        total_seen = 0

        while True:
            req = AccountTx(
                account=classic_address,
                ledger_index_min=0,
                ledger_index_max=-1,
                limit=100,
                marker=marker
            )
            response = client.request(req).result
            txs = response.get("transactions", [])
            if not txs:
                break

            for entry in txs:
                total_seen += 1
                tx_obj = entry.get("tx") or entry.get("tx_json") or entry.get("transaction")
                if not tx_obj:
                    continue

                if tx_obj.get("TransactionType") == "Payment":
                    payment_count += 1

            marker = response.get("marker")
            if not marker:
                break

        print(f"✅ Found {payment_count} Payment txs for {classic_address} (out of {total_seen} total txs)")
        return payment_count

    except Exception as e:
        print(f"❌ Error fetching XRPL txs for {classic_address}: {e}")
        return 0


def generate_explanation(prev_entry, new_price, demand, supply, momentum):
    print("[EXPLANATION] Generating explanation...")

    if not prev_entry:
        print("ℹ️ First price entry detected.")
        return ["Initial price entry."]

    prev_price = prev_entry["price"]
    prev_demand = prev_entry.get("demand_number") or 0
    prev_supply = prev_entry.get("supply_number") or 0
    prev_momentum = prev_entry.get("momentum") or 0

    percent_change = ((new_price - prev_price) / prev_price) * 100 if prev_price else 0
    direction = "increased" if percent_change > 0 else "decreased"
    change = abs(round(percent_change, 2))

    reasons = []

    if demand > prev_demand:
        reasons.append("Demand increased, signaling stronger buyer interest.")
    elif demand < prev_demand:
        reasons.append("Demand fell, reducing upward pressure on price.")

    if supply < prev_supply:
        reasons.append("Available supply decreased, contributing to a price rise.")
    elif supply > prev_supply:
        reasons.append("Supply increased, easing scarcity effects.")

    if momentum > prev_momentum:
        reasons.append("Market momentum grew, reflecting positive sentiment.")
    elif momentum < prev_momentum:
        reasons.append("Momentum slowed down, weakening bullish trends.")

    print(f"✅ Explanation generated: Price {direction} by {change}%.")
    return [f"Price {direction} by {change}%. " + " ".join(reasons)]



def insert_price_history(product_id, new_price, demand, supply, momentum, explanation):
    timestamp = datetime.now(timezone.utc).isoformat()
    print(f"[DB INSERT] Logging price history for Product ID: {product_id} at {timestamp}")

    try:
        supabase.table("price_history").insert({
            "id": str(uuid.uuid4()),
            "product_id": product_id,
            "price": new_price,
            "timestamp": timestamp,
            "explanation": explanation,
            "demand_number": demand,
            "supply_number": supply,
            "momentum": momentum
        }).execute()
        print("✅ Inserted price history successfully.")
    except Exception as e:
        print(f"❌ Error inserting into price_history: {e}")


def fetch_sorted_price_history(product_id):
    print(f"[DB FETCH] Fetching history for Product ID: {product_id}")
    try:
        history_resp = supabase.table("price_history") \
            .select("*") \
            .eq("product_id", product_id) \
            .execute()
        history = history_resp.data or []
        sorted_history = sorted(history, key=lambda x: parser.parse(x["timestamp"]))
        print(f"✅ Retrieved {len(sorted_history)} entries.")
        return sorted_history
    except Exception as e:
        print(f"❌ Error fetching price history: {e}")
        return []

# ---------- Main Route ---------- #

@app.route("/update_price", methods=["POST"])
def update_price():
    print("Hi")
    try:
        print("\n🔄 Starting /update_price routine...")

        products_resp = supabase.table("products").select("*").execute()
        products = products_resp.data

        if not products:
            print("⚠️ No products found in database.")
            return jsonify({"error": "No products found"}), 404

        print(f"📦 Found {len(products)} products to update.")
        result = {}

        for idx, product in enumerate(products):
            print(f"\n▶️ Processing product {idx+1}/{len(products)}")
            product_id = product['id']
            base_price = product.get("price", 0)
            classic_address = product["classic_address"]

            print(f"🔍 Product ID: {product_id}")
            print(f"💰 Base Price: {base_price}")
            print(f"🏦 XRPL Wallet: {classic_address}")

            previous_entries = fetch_sorted_price_history(product_id)
            prev_entry = previous_entries[-1] if previous_entries else None

            demand = get_demand_from_xrpl_wallet(classic_address, xrpl_client)

            # Get supply from first entry or assume 1000
            initial_supply = 1000
            if previous_entries:
                initial_supply = previous_entries[0].get("supply_number", 1000)
                print(f"📦 Initial supply from history: {initial_supply}")
            else:
                print(f"📦 Using default initial supply: {initial_supply}")

            if not initial_supply:
                initial_supply = 50
            supply = max(0, initial_supply - demand)
            momentum = 3  # Replace later with real metric
            print(f"📈 Demand: {demand} | 📉 Supply: {supply} | ⚡ Momentum: {momentum}")

            new_price = int(base_price + demand * 10 + momentum * 80 + supply * -50)
            print(f"💸 New Price Calculated: {new_price}")

            explanation = generate_explanation(prev_entry, new_price, demand, supply, momentum)

            insert_price_history(product_id, new_price, demand, supply, momentum, explanation)

            full_history = fetch_sorted_price_history(product_id)
            price_list = [h["price"] for h in full_history]
            timestamp_list = [h["timestamp"] for h in full_history]
            supply_list = [h.get("supply_number", 0) for h in full_history]
            demand_list = [h.get("demand_number", 0) for h in full_history]
            momentum_list = [h.get("momentum", 0) for h in full_history]
            explanation_list = [
                h["explanation"] if isinstance(h["explanation"], list) else [h["explanation"]]
                for h in full_history
            ]

            result[str(product_id)] = {
                "price_history": price_list,
                "timestamp": timestamp_list,
                "supply": supply_list,
                "demand": demand_list,
                "momentum": momentum_list,
                "explanation": explanation_list,
                "wallet_transaction_url": f"https://testnet.xrpl.org/accounts/{classic_address}"
            }

        print("✅ All product prices updated.\n")
        return jsonify(result), 200

    except Exception as e:
        print("❌ Error in update_price:\n", traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/stock", methods=["GET"])
def get_stock():
    return jsonify({"message": "Stock endpoint stub called"}), 200


@app.route("/wallet", methods=["GET"])
def wallet_info():
    return jsonify({"message": "Wallet info stub called"}), 200


@app.route("/buy/<product_id>", methods=["POST"])
def initiate_escrow(product_id):
    return jsonify({"message": f"Escrow initiated for product {product_id}"}), 200


@app.route("/order_delivery_confirmation/<purchase_id>", methods=["POST"])
def release_escrow(purchase_id):
    return jsonify({"message": f"Escrow released for purchase {purchase_id}"}), 200


@app.route("/order_delivery_failed/<purchase_id>", methods=["POST"])
def refund_escrow(purchase_id):
    return jsonify({"message": f"Escrow refunded to buyer for purchase {purchase_id}"}), 200






# ---------- Helper Function ---------- #

def convert_xrp_to_local_currency(xrp_price: float):
    if xrp_price <= 0:
        return {"error": "Invalid XRP price. Must be > 0."}

    try:
        # Geolocation via IP
        geo_resp = requests.get("https://ipinfo.io/json")
        geo_data = geo_resp.json()
        country_code = geo_data.get("country", "US")  # fallback
        city = geo_data.get("city", "Unknown")

        # Country → Currency map
        country_currency_map = {
            "SG": "SGD", "US": "USD", "IN": "INR", "MY": "MYR", "PH": "PHP", "ID": "IDR",
            "CN": "CNY", "JP": "JPY", "GB": "GBP", "EU": "EUR", "NG": "NGN", "KE": "KES",
            "MX": "MXN", "CA": "CAD", "AU": "AUD"
        }
        currency = country_currency_map.get(country_code, "USD")

        # CoinGecko XRP conversion
        url = f"https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies={currency.lower()}"
        rate_resp = requests.get(url)
        rate_data = rate_resp.json()

        xrp_to_currency = rate_data.get("ripple", {}).get(currency.lower())
        if xrp_to_currency is None:
            return {"error": f"No conversion rate for currency: {currency}"}

        converted_price = round(xrp_price * xrp_to_currency, 4)

        return {
            "status": "success",
            "xrp_price": xrp_price,
            "converted_price": converted_price,
            "local_currency": currency,
            "conversion_rate": xrp_to_currency,
            "location": {
                "city": city,
                "country_code": country_code
            }
        }

    except Exception as e:
        return {"error": str(e)}


# ---------- Flask Route ---------- #

@app.route("/convert_xrp_auto", methods=["POST"])
def convert_xrp_auto():
    try:
        data = request.get_json()
        xrp_price = float(data.get("xrp_price", 0))
        if xrp_price <= 0:
            return jsonify({"error": "Invalid XRP price"}), 400

        result = convert_xrp_to_local_currency(xrp_price)

        if "error" in result:
            return jsonify({"error": result["error"]}), 500

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)