import sys
from PIL import Image

def copy_image_below(filename):
    # Open the image
    img = Image.open(filename)
    
    # Get the dimensions of the original image
    width, height = img.size
    
    # Create a new image with double the height
    new_img = Image.new(img.mode, (width, height * 2))
    
    # Paste the original image twice
    new_img.paste(img, (0, 0))
    new_img.paste(img, (0, height))
    
    # Save the new image
    new_filename = f"copied_{filename}"
    new_img.save(new_filename)
    print(f"New image saved as {new_filename}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <image_filename>")
        sys.exit(1)
    
    filename = sys.argv[1]
    copy_image_below(filename)
