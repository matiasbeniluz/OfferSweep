import os
from PIL import Image, ImageDraw

def create_icons():
    # Ensure icons folder exists
    os.makedirs('icons', exist_ok=True)
    
    # Colors
    chase_blue = (10, 30, 63, 255)       # Premium Royal Deep Blue #0a1e3f
    chase_gold = (212, 175, 55, 255)     # Warm Gold #d4af37
    white = (255, 255, 255, 255)
    
    sizes = [16, 48, 128]
    
    for size in sizes:
        # Create image with transparent background
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Calculate dimensions
        padding = max(1, size // 10)
        card_w = size - 2 * padding
        card_h = int(card_w * 0.63)  # Credit card aspect ratio approx 1.58
        
        # Center card vertically
        y_offset = (size - card_h) // 2
        
        # 1. Base card body (Rounded rectangle)
        r = max(2, size // 12)
        draw.rounded_rectangle(
            [padding, y_offset, padding + card_w, y_offset + card_h],
            radius=r,
            fill=chase_blue,
            outline=chase_gold,
            width=max(1, size // 32)
        )
        
        # 2. Golden Chip
        chip_w = max(2, card_w // 5)
        chip_h = max(2, card_h // 4)
        chip_x = padding + max(2, card_w // 10)
        chip_y = y_offset + (card_h - chip_h) // 2
        chip_r = max(1, size // 48)
        draw.rounded_rectangle(
            [chip_x, chip_y, chip_x + chip_w, chip_y + chip_h],
            radius=chip_r,
            fill=chase_gold
        )
        
        # 3. Magnetic stripe / accent lines on larger sizes
        if size >= 48:
            # Drawing elegant gold and white wave lines to indicate action / speed / power
            accent_x = chip_x + chip_w + max(2, size // 24)
            accent_y = chip_y
            accent_w = card_w - (chip_w + max(4, size // 6))
            
            # Plus icon for "adding offers"
            plus_size = max(4, size // 8)
            px = padding + card_w - plus_size - max(2, size // 24)
            py = y_offset + max(2, size // 24)
            
            # Draw a plus sign in gold
            draw.line([px + plus_size//2, py, px + plus_size//2, py + plus_size], fill=chase_gold, width=max(1, size//32))
            draw.line([px, py + plus_size//2, px + plus_size, py + plus_size//2], fill=chase_gold, width=max(1, size//32))
            
            # Simple logo/card waves
            wave_y = chip_y + chip_h // 2
            draw.arc([accent_x, wave_y - 2, accent_x + accent_w, wave_y + 2], 0, 180, fill=white, width=1)
            
        img.save(f'icons/icon-{size}.png')
        print(f"Created icons/icon-{size}.png ({size}x{size})")

if __name__ == '__main__':
    create_icons()
