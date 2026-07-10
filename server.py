import io
import numpy as np
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from ultralytics import YOLOWorld
# Import the Supabase client
from supabase import create_client, Client

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Initialize Supabase Connection
# Find these values inside your Supabase Project Settings -> API tab
SUPABASE_URL = "https://jnnldxizszfvtuzligxz.supabase.co" 
SUPABASE_KEY = "sb_publishable_RzD9280Zl9COIPrM2bp-_A_ObCMUfzC"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. Load the Pretrained YOLO-World model
model = YOLOWorld("yolov8s-world.pt")

# 3. Fetch data from Supabase at startup
def load_items_from_database():
    try:
        # Replace 'your_table_name' and 'column_name' with your exact Supabase structure
        response = supabase.table("scraped_luggage_data").select("item_name").execute()
        
        # Extract rows into a clean string list (e.g., ["backpack", "duffel bag", "large suitcase"])
        items = [row["item_name"] for row in response.data]
        
        # If database is empty, fall back to defaults so it doesn't crash during presentation
        return items if items else ["backpack", "suitcase", "handbag"]
    except Exception as e:
        print(f"Database error, using backup items: {e}")
        return ["backpack", "suitcase", "handbag"]

# Update YOLO-World with your live scraped database elements
live_scraped_items = load_items_from_database()
model.set_classes(live_scraped_items)


@app.post("/scan")
async def scan_image(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    
    open_cv_image = np.array(image)
    open_cv_image = open_cv_image[:, :, ::-1].copy()
    
    results = model(open_cv_image)
    
    detected_items = []
    for r in results:
        for c in r.boxes.cls:
            item_name = model.names[int(c)]
            if item_name not in detected_items:
                detected_items.append(item_name)
                
    # 4. HACKATHON LOGIC: Classify into Cabin vs Check-In
    # You can customize these arrays based on airline rules
    cabin_allowed = ["backpack", "handbag", "laptop bag", "duffel bag"]
    
    luggage_classification = "Unknown"
    if any(item in cabin_allowed for item in detected_items):
        luggage_classification = "Cabin Luggage"
    elif len(detected_items) > 0:
        luggage_classification = "Check-in Luggage"

    return {
        "detected_items": detected_items,
        "classification": luggage_classification
    }