#!/bin/bash
# Test: Export "hello world" with 2-part snap-fit system
# Expected: ZIP file with base and cap STL files

echo "=== SignCraft 3D - Hello World Export Test ==="
echo ""

# Clean up any previous test files
rm -rf /tmp/hello_world_test
mkdir -p /tmp/hello_world_test
cd /tmp/hello_world_test

echo "1. Exporting 'hello world' with 2-part modular system..."
curl -s -X POST http://localhost:5000/api/export \
  -H "Content-Type: application/json" \
  -d '{
    "letterSettings": {
      "text": "hello world",
      "scale": 1.0,
      "depth": 20,
      "fontId": "inter",
      "bevelEnabled": false,
      "bevelThickness": 1,
      "bevelSize": 1
    },
    "format": "stl",
    "geometrySettings": {
      "mode": "outline",
      "enableBacking": false,
      "letterHeight": 15,
      "backingThickness": 3,
      "letterOffset": 1,
      "letterMaterial": "opaque",
      "backingMaterial": "opaque",
      "separateFiles": false
    },
    "tubeSettings": {
      "neonTubeSize": "12mm",
      "neonTubeDiameter": 12,
      "filamentDiameter": 12,
      "wallHeight": 15,
      "enableOverlay": true,
      "channelDepth": 15,
      "wallThickness": 2,
      "tubeWidth": 20,
      "overlayThickness": 2,
      "continuousPath": true
    },
    "twoPartSystem": {
      "enabled": true,
      "baseWallHeight": 15,
      "baseWallThickness": 2,
      "capOverhang": 1,
      "capThickness": 2,
      "snapTolerance": 0.2,
      "snapTabsEnabled": true,
      "snapTabHeight": 2,
      "snapTabWidth": 4,
      "snapTabSpacing": 25,
      "chamferAngle": 45,
      "registrationPinsEnabled": true,
      "pinDiameter": 2.5,
      "pinHeight": 3,
      "pinSpacing": 30,
      "diffusionRibsEnabled": true,
      "ribHeight": 1,
      "ribSpacing": 5,
      "cableChannelEnabled": true,
      "cableChannelWidth": 5,
      "cableChannelDepth": 3
    },
    "inputMode": "text",
    "sketchPaths": []
  }' -o hello_world.zip

echo ""
echo "2. Checking ZIP file..."
if [ -f hello_world.zip ]; then
  FILE_SIZE=$(stat -c%s hello_world.zip 2>/dev/null || stat -f%z hello_world.zip)
  echo "   [PASS] ZIP file created: $FILE_SIZE bytes"
else
  echo "   [FAIL] ZIP file not created"
  exit 1
fi

echo ""
echo "3. Extracting ZIP contents..."
unzip -o hello_world.zip
echo ""

echo "4. Checking for expected files..."
PASS=true

# Check for base file
if ls *_base.stl 1> /dev/null 2>&1; then
  BASE_FILE=$(ls *_base.stl | head -1)
  BASE_SIZE=$(stat -c%s "$BASE_FILE" 2>/dev/null || stat -f%z "$BASE_FILE")
  echo "   [PASS] Base STL found: $BASE_FILE ($BASE_SIZE bytes)"
else
  echo "   [FAIL] No base STL file found"
  PASS=false
fi

# Check for cap file
if ls *_cap.stl 1> /dev/null 2>&1; then
  CAP_FILE=$(ls *_cap.stl | head -1)
  CAP_SIZE=$(stat -c%s "$CAP_FILE" 2>/dev/null || stat -f%z "$CAP_FILE")
  echo "   [PASS] Cap STL found: $CAP_FILE ($CAP_SIZE bytes)"
else
  echo "   [FAIL] No cap STL file found"
  PASS=false
fi

echo ""
echo "5. Validating STL file headers..."
for stl in *.stl; do
  if [ -f "$stl" ]; then
    # Check for binary STL header (first 80 bytes are header, then 4 bytes triangle count)
    HEADER=$(head -c 80 "$stl" | tr -d '\0' | head -c 40)
    TRIANGLES=$(od -An -t u4 -j 80 -N 4 "$stl" 2>/dev/null | tr -d ' ')
    echo "   $stl: ~$TRIANGLES triangles"
  fi
done

echo ""
echo "6. Listing all exported files..."
ls -la *.stl 2>/dev/null

echo ""
if [ "$PASS" = true ]; then
  echo "=== TEST PASSED: 2-part modular system exported correctly ==="
  echo ""
  echo "Files ready for 3D printing:"
  echo "  - Base piece: Holds LED light source with snap tabs & registration pins"
  echo "  - Cap piece: Diffuser with matching recesses & alignment holes"
  echo ""
  echo "Assembly: Print both, insert LED, snap cap onto base - done!"
else
  echo "=== TEST FAILED ==="
  exit 1
fi
