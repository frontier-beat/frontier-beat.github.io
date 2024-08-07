import sys
from PIL import Image, ImageFilter
import numpy as np

def apply_horizontal_gradient_blur(image_path, output_path, max_blur_radius=10):
    # Open the image
    img = Image.open(image_path)
    width, height = img.size

    # Create a blank canvas for the blurred image
    blurred = Image.new('RGB', (width, height))

    # Calculate the center of the image
    center_x = width // 2

    # Create a horizontal gradient
    gradient = np.exp(np.exp(np.linspace(0, 1, width))) ** 5
    gradient += gradient[::-1]
    gradient -= gradient.min()
    gradient /= gradient.max()

    # Apply blur with increasing intensity towards the edges
    for x in range(width):
        blur_amount = gradient[x] * max_blur_radius
        
        # Calculate the slice boundaries
        left = max(0, x - max_blur_radius)
        right = min(width, x + max_blur_radius + 1)
        
        # Extract a vertical slice centered on the current x
        vertical_slice = img.crop((left, 0, right, height))
        
        # Apply blur to the slice
        blurred_slice = vertical_slice.filter(ImageFilter.GaussianBlur(radius=blur_amount))
        
        # Paste only the center column of the blurred slice
        blurred.paste(blurred_slice.crop((max_blur_radius, 0, max_blur_radius + 1, height)), (x, 0))

    blurred = Image.blend(img, blurred, 0.75)

    # Save the result
    blurred.save(output_path)
    print(f"Blurred image saved as {output_path}")


def main(argv):
    if len(argv) < 3:
        print("Usage: python script.py <input_path> <output_path> [max_blur_radius]")
        sys.exit(1)

    input_image = argv[1]
    output_image = argv[2]

    max_blur_radius = 10  # default value
    if len(argv) > 2:
        try:
            max_blur_radius = int(argv[3])
        except ValueError:
            print("Error: max_blur_radius must be an integer")
            sys.exit(1)

    apply_horizontal_gradient_blur(input_image, output_image, max_blur_radius)
    print(f"Processed {input_image} and saved result to {output_image}")

if __name__ == "__main__":
    main(sys.argv)
