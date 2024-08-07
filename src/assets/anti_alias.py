import sys
from PIL import Image, ImageFilter

def smooth_text_edges(input_path, output_path, threshold=200, smoothing_factor=0.5):
    # Open the image
    img = Image.open(input_path).convert('RGBA')

    # Create a binary mask of the text
    gray = img.convert('L')
    mask = gray.point(lambda x: 255 if x < threshold else 0, '1')

    # Slightly dilate the mask to cover edge pixels
    mask = mask.filter(ImageFilter.MaxFilter(3))

    # Create a blurred version of the image
    blurred = img.filter(ImageFilter.GaussianBlur(radius=smoothing_factor))

    # Composite the original image and the blurred version using the mask
    result = Image.composite(blurred, img, mask)

    # Save the result
    result.save(output_path)

    print(f"Smoothed image saved to {output_path}")

def main(argv):
    if len(argv) < 3:
        print("Usage: python script.py <input_image> <output_image> [threshold] [smoothing_factor]")
        sys.exit(1)

    input_path = argv[1]
    output_path = argv[2]

    threshold = 200  # default value
    smoothing_factor = 0.5  # default value

    if len(argv) >= 4:
        try:
            threshold = int(argv[3])
        except ValueError:
            print("Threshold must be an integer. Using default value of 200.")

    if len(argv) >= 5:
        try:
            smoothing_factor = float(argv[4])
        except ValueError:
            print("Smoothing factor must be a float. Using default value of 0.5.")

    smooth_text_edges(input_path, output_path, threshold, smoothing_factor)

if __name__ == "__main__":
    main(sys.argv)
