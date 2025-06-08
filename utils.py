import time
from datetime import datetime
from xrpl.clients import JsonRpcClient
from xrpl.wallet import Wallet
from xrpl.models.transactions import EscrowCreate
from xrpl.transaction import autofill_and_sign, submit_and_wait
from xrpl.utils import xrp_to_drops, datetime_to_ripple_time
from xrpl.account import get_balance
from xrpl.clients import JsonRpcClient
from xrpl.models.transactions import EscrowFinish
from xrpl.transaction import submit_and_wait
from xrpl.wallet import Wallet
from supabase import create_client, Client

from xrpl.models.requests import AccountObjects
from xrpl.utils import ripple_time_to_datetime

# Supabase connection
url = "https://wacicyiidaysfjdiaeim.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhY2ljeWlpZGF5c2ZqZGlhZWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0OTA5NDUsImV4cCI6MjA2MzA2Njk0NX0.6FpJppdFQNPkmd6dBxsShPbLtLYe0LAS2YrsN84LTUI"    # Your anon/public API key
supabase = create_client(url, key)


def get_user_wallet(user_id):
    # Get user wallet from supabase
    user_details = supabase.table("profiles").select("*").eq("id", user_id).execute()
    private_key = user_details.data[0]["private_key"]
    public_key = user_details.data[0]["public_key"]
    classic_address = user_details.data[0]["classic_address"]
    seed = user_details.data[0]["seed"]
    user_wallet = Wallet(seed=seed, public_key=public_key, private_key=private_key)
    # check if wallet is valid
    if user_wallet.classic_address is None:
        raise ValueError("Wallet is not valid")
    return user_wallet

def get_product_wallet(product_id):
    # Get product wallet from supabase
    product_details = supabase.table("products").select("*").eq("id", product_id).execute()
    public_key = product_details.data[0]["public_key"]
    private_key = product_details.data[0]["private_key"]
    seed = product_details.data[0]["seed"]
    product_wallet = Wallet(seed=seed, public_key=public_key, private_key=private_key)
    # check if wallet is valid
    if product_wallet.classic_address is None:
        raise ValueError("Wallet is not valid")
    return product_wallet

def get_product_price(product_id):
    # Get product price from price history most recent timestamp
    product_details = supabase.table("price_history").select("*").eq("product_id", product_id).order("timestamp", desc=True).limit(1).execute()
    return product_details.data[0]["price"]      

def get_product_price_stub(product_id):
    return 0.001

def create_escrow(amount, buyer_wallet=None, destination_address=None):
    JSON_RPC_URL = "https://s.altnet.rippletest.net:51234"
    client = JsonRpcClient(JSON_RPC_URL)

    # Default: Use a hardcoded testnet wallet if not provided
    if buyer_wallet is None:
        buyer_wallet = Wallet(seed="sEdTS6AKW3yKReAp9XojjU1Hig7Kc4W", public_key="ED6028659510681DE4C2C2E3AA8796E400CD7153FB4BA3B21A395BD248DB657925", private_key="ED68F7D369A0C2823392DB31C298D9B700BBB07B563D01318027EE1022387032E0")

    if destination_address is None:
        destination_address = "rB463AKyEnKDyQn6FDsanSrzndFRbEoiee"

    
    balance = get_balance(buyer_wallet.classic_address, client)
    if float(balance) < amount + 1:  # Add 1 XRP buffer for fees
        raise ValueError("Wallet has insufficient XRP to fund escrow.")

    # Set finish time: 1 hour from now
    finish_after = datetime_to_ripple_time(datetime.now()) + 100

    # Create EscrowCreate transaction
    escrow_tx = EscrowCreate(
        account=buyer_wallet.classic_address,
        destination=destination_address,
        amount=xrp_to_drops(amount),
        finish_after=finish_after,
    )

    # Sign, autofill and submit
    signed = autofill_and_sign(escrow_tx, client, buyer_wallet)
    response = submit_and_wait(signed, client)

    print("✅ Escrow Created Successfully")
    print("Transaction Hash:", signed.get_hash())
    print("Escrow Sequence:", response.result["tx_json"]["Sequence"])
    print("Ledger Result:", response.result.get("engine_result"))

    return {
        "tx_hash": signed.get_hash(),
        "sequence": response.result["tx_json"]["Sequence"],
        "finish_after": finish_after,
    }


def finish_escrow(offer_sequence,buyer_wallet=None):
    # Setup XRPL testnet client
    JSON_RPC_URL = "https://s.altnet.rippletest.net:51234"
    client = JsonRpcClient(JSON_RPC_URL)

    # Replace with your buyer wallet if not provided
    if buyer_wallet is None:
        buyer_wallet = Wallet(seed="sEdTS6AKW3yKReAp9XojjU1Hig7Kc4W", public_key="ED6028659510681DE4C2C2E3AA8796E400CD7153FB4BA3B21A395BD248DB657925", private_key="ED68F7D369A0C2823392DB31C298D9B700BBB07B563D01318027EE1022387032E0")

    if offer_sequence is None:
        raise ValueError("❌ You must provide the offer_sequence from EscrowCreate")

    # Create EscrowFinish transaction
    finish_tx = EscrowFinish(
        account=buyer_wallet.classic_address,
        owner=buyer_wallet.classic_address,
        offer_sequence=offer_sequence,
    )

    # Submit transaction and wait for confirmation
    response = submit_and_wait(finish_tx, client, buyer_wallet)

    print("✅ Escrow Finished Successfully")
    print("Ledger Result:", response.result.get("engine_result"))
    print("Transaction Result:", response.result)


def get_active_escrows(buyer_address="rJqRYMxN1C943LG4caeZZfPdxRfcGq6pQ7"):
    # Setup client and buyer address
    client = JsonRpcClient("https://s.altnet.rippletest.net:51234")

    # Request account objects for the wallet
    request = AccountObjects(account=buyer_address, type="escrow")
    response = client.request(request)

    # Filter for active escrows
    active_escrows = response.result.get("account_objects", [])

    print(active_escrows)

    # Return data structure
    escrow_data = []

    for escrow in active_escrows:
        print(escrow)
        amount_xrp = int(escrow["Amount"]) / 1_000_000
        created_time = ripple_time_to_datetime(escrow["PreviousTxnLgrSeq"])  # approximate
        finish_after = ripple_time_to_datetime(escrow["FinishAfter"]) if "FinishAfter" in escrow else "N/A"

        print(f"Escrow for {amount_xrp} XRP")
        print(f"Finish After: {finish_after}")
        print(f"Destination: {escrow['Destination']}")
        print("-" * 30)
        escrow_data.append({
            "amount": amount_xrp,
            "created_time": created_time,
            "finish_after": finish_after,
            "destination": escrow["Destination"],
        })
        # Get product details based on destination address from supabase
        product_details = supabase.table("products").select("*").eq("classic_address", escrow["Destination"]).execute()
        if product_details.data:
            product_name = product_details.data[0]["name"]
            product_description = product_details.data[0]["description"]
            product_price = product_details.data[0]["price"]
            product_id = product_details.data[0]["id"]
            escrow_data[-1]["product_name"] = product_name
            #escrow_data[-1]["product_image"] = product_image
            escrow_data[-1]["product_description"] = product_description
            escrow_data[-1]["product_price"] = product_price
            escrow_data[-1]["id"] = product_id
        print(escrow_data)
    
    return escrow_data