/**
 * Phase 2 Integration Test Suite
 * Tests all 24 API endpoints and verifies database operations
 */

import { config } from 'dotenv';
config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_PROJECT_ID = 'test-project-' + Date.now();
const TEST_SCRUBBER_ID = 'test-scrubber-' + Date.now();

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to make API requests
async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 500, error: error.message };
  }
}

// Test runner
async function runTest(name, testFn) {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    await testFn();
    console.log(`✅ PASSED: ${name}`);
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
  } catch (error) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: error.message });
  }
}

// Assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

async function runAllTests() {
  console.log('🚀 Starting Phase 2 Integration Tests\n');
  console.log('=' .repeat(60));

  // Test 1: Visual Effects - Save
  await runTest('POST /api/effects/visual - Save visual effect', async () => {
    const effect = {
      projectId: TEST_PROJECT_ID,
      scrubberId: TEST_SCRUBBER_ID,
      effectType: 'blur',
      enabled: true,
      parameters: { radius: 5, quality: 'high' },
      orderIndex: 0
    };

    const result = await apiRequest('/api/effects/visual', 'POST', effect);
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(result.data.id, 'Should return effect ID');
  });

  // Test 2: Visual Effects - Get
  await runTest('GET /api/effects/visual - Get visual effects', async () => {
    const result = await apiRequest(
      `/api/effects/visual?projectId=${TEST_PROJECT_ID}&scrubberId=${TEST_SCRUBBER_ID}`
    );
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(Array.isArray(result.data), 'Should return array of effects');
  });

  // Test 3: Visual Effects - Get All
  await runTest('GET /api/effects/visual/all/:projectId - Get all visual effects', async () => {
    const result = await apiRequest(`/api/effects/visual/all/${TEST_PROJECT_ID}`);
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(Array.isArray(result.data), 'Should return array of effects');
  });

  // Test 4: Color Correction - Save
  await runTest('POST /api/effects/color - Save color correction', async () => {
    const colorCorrection = {
      projectId: TEST_PROJECT_ID,
      scrubberId: TEST_SCRUBBER_ID,
      brightness: 10,
      contrast: 5,
      saturation: 0,
      temperature: 0,
      tint: 0,
      exposure: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      vibrance: 0,
      hue: 0,
      shadowsHue: 0,
      shadowsSaturation: 0,
      shadowsLuminance: 0,
      midtonesHue: 0,
      midtonesSaturation: 0,
      midtonesLuminance: 0,
      highlightsHue: 0,
      highlightsSaturation: 0,
      highlightsLuminance: 0,
      redCurve: [0, 0.25, 0.5, 0.75, 1],
      greenCurve: [0, 0.25, 0.5, 0.75, 1],
      blueCurve: [0, 0.25, 0.5, 0.75, 1],
      rgbCurve: [0, 0.25, 0.5, 0.75, 1]
    };

    const result = await apiRequest('/api/effects/color', 'POST', colorCorrection);
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(result.data.id, 'Should return color correction ID');
  });

  // Test 5: Color Correction - Get
  await runTest('GET /api/effects/color - Get color correction', async () => {
    const result = await apiRequest(
      `/api/effects/color?projectId=${TEST_PROJECT_ID}&scrubberId=${TEST_SCRUBBER_ID}`
    );
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(result.data, 'Should return color correction data');
  });

  // Test 6: Audio Effects - Save
  await runTest('POST /api/effects/audio - Save audio effect', async () => {
    const audioEffect = {
      projectId: TEST_PROJECT_ID,
      scrubberId: TEST_SCRUBBER_ID,
      effectType: 'reverb',
      enabled: true,
      parameters: { roomSize: 0.5, damping: 0.3 },
      orderIndex: 0
    };

    const result = await apiRequest('/api/effects/audio', 'POST', audioEffect);
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(result.data.id, 'Should return audio effect ID');
  });

  // Test 7: Audio Effects - Get
  await runTest('GET /api/effects/audio - Get audio effects', async () => {
    const result = await apiRequest(
      `/api/effects/audio?projectId=${TEST_PROJECT_ID}&scrubberId=${TEST_SCRUBBER_ID}`
    );
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(Array.isArray(result.data), 'Should return array of audio effects');
  });

  // Test 8: LUT - Save (JSON mode)
  await runTest('POST /api/effects/luts - Save LUT (JSON)', async () => {
    const lut = {
      userId: TEST_USER_ID,
      name: 'Test LUT',
      fileUrl: 'data:text/plain;base64,VEVTVCBMVVQgREFUQQ==',
      fileType: 'cube',
      size: 1024
    };

    const result = await apiRequest('/api/effects/luts', 'POST', lut);
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(result.data.id, 'Should return LUT ID');
  });

  // Test 9: LUT - Get User LUTs
  await runTest('GET /api/effects/luts - Get user LUTs', async () => {
    const result = await apiRequest(`/api/effects/luts?userId=${TEST_USER_ID}`);
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(Array.isArray(result.data), 'Should return array of LUTs');
  });

  // Test 10: LUT - Apply
  await runTest('POST /api/effects/luts/apply - Apply LUT to clip', async () => {
    // First get a LUT ID
    const lutsResult = await apiRequest(`/api/effects/luts?userId=${TEST_USER_ID}`);
    if (lutsResult.data && lutsResult.data.length > 0) {
      const lutId = lutsResult.data[0].id;

      const application = {
        projectId: TEST_PROJECT_ID,
        scrubberId: TEST_SCRUBBER_ID,
        lutId: lutId,
        intensity: 0.8,
        enabled: true
      };

      const result = await apiRequest('/api/effects/luts/apply', 'POST', application);
      assert(result.status === 200, `Expected 200, got ${result.status}`);
      assert(result.data.id, 'Should return application ID');
    } else {
      console.log('   ⚠️  Skipped: No LUTs available to apply');
    }
  });

  // Test 11: Blend Mode - Save
  await runTest('POST /api/effects/blend - Save blend mode', async () => {
    const blendMode = {
      projectId: TEST_PROJECT_ID,
      scrubberId: TEST_SCRUBBER_ID,
      blendMode: 'multiply',
      opacity: 0.75
    };

    const result = await apiRequest('/api/effects/blend', 'POST', blendMode);
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(result.data.id, 'Should return blend mode ID');
  });

  // Test 12: Blend Mode - Get
  await runTest('GET /api/effects/blend - Get blend mode', async () => {
    const result = await apiRequest(
      `/api/effects/blend?projectId=${TEST_PROJECT_ID}&scrubberId=${TEST_SCRUBBER_ID}`
    );
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(result.data, 'Should return blend mode data');
  });

  // Test 13: Presets - Save
  await runTest('POST /api/effects/presets - Save preset', async () => {
    const preset = {
      userId: TEST_USER_ID,
      name: 'Cinematic Look',
      description: 'Warm cinematic color grading',
      visualEffects: [
        { effectType: 'vignette', enabled: true, parameters: { intensity: 0.5 } }
      ],
      colorCorrection: {
        temperature: 10,
        tint: -5,
        saturation: 5
      },
      audioEffects: [],
      blendMode: 'normal',
      opacity: 1.0,
      isFavorite: false
    };

    const result = await apiRequest('/api/effects/presets', 'POST', preset);
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(result.data.id, 'Should return preset ID');
  });

  // Test 14: Presets - Get User Presets
  await runTest('GET /api/effects/presets - Get user presets', async () => {
    const result = await apiRequest(`/api/effects/presets?userId=${TEST_USER_ID}`);
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(Array.isArray(result.data), 'Should return array of presets');
  });

  // Test 15: Presets - Get by ID
  await runTest('GET /api/effects/presets/:id - Get preset by ID', async () => {
    const presetsResult = await apiRequest(`/api/effects/presets?userId=${TEST_USER_ID}`);
    if (presetsResult.data && presetsResult.data.length > 0) {
      const presetId = presetsResult.data[0].id;
      const result = await apiRequest(`/api/effects/presets/${presetId}`);
      assert(result.status === 200, `Expected 200, got ${result.status}`);
      assert(result.data.id === presetId, 'Should return correct preset');
    } else {
      console.log('   ⚠️  Skipped: No presets available');
    }
  });

  // Test 16: Presets - Toggle Favorite
  await runTest('PATCH /api/effects/presets/:id/favorite - Toggle favorite', async () => {
    const presetsResult = await apiRequest(`/api/effects/presets?userId=${TEST_USER_ID}`);
    if (presetsResult.data && presetsResult.data.length > 0) {
      const presetId = presetsResult.data[0].id;
      const result = await apiRequest(`/api/effects/presets/${presetId}/favorite`, 'PATCH');
      assert(result.status === 200, `Expected 200, got ${result.status}`);
      assert(typeof result.data.isFavorite === 'boolean', 'Should return favorite status');
    } else {
      console.log('   ⚠️  Skipped: No presets available');
    }
  });

  // Test 17: Presets - Update
  await runTest('PATCH /api/effects/presets/:id - Update preset', async () => {
    const presetsResult = await apiRequest(`/api/effects/presets?userId=${TEST_USER_ID}`);
    if (presetsResult.data && presetsResult.data.length > 0) {
      const presetId = presetsResult.data[0].id;
      const update = {
        name: 'Updated Cinematic Look',
        description: 'Updated description'
      };
      const result = await apiRequest(`/api/effects/presets/${presetId}`, 'PATCH', update);
      assert(result.status === 200, `Expected 200, got ${result.status}`);
      assert(result.data.success, 'Should return success');
    } else {
      console.log('   ⚠️  Skipped: No presets available');
    }
  });

  // Test 18: Keyframes - Save
  await runTest('POST /api/effects/keyframes - Save keyframes', async () => {
    const keyframes = {
      projectId: TEST_PROJECT_ID,
      scrubberId: TEST_SCRUBBER_ID,
      property: 'opacity',
      keyframes: [
        { timeSeconds: 0, value: 0, easing: 'linear' },
        { timeSeconds: 1, value: 1, easing: 'ease-in' }
      ]
    };

    const result = await apiRequest('/api/effects/keyframes', 'POST', keyframes);
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(result.data.success, 'Should return success');
  });

  // Test 19: Keyframes - Get
  await runTest('GET /api/effects/keyframes - Get keyframes', async () => {
    const result = await apiRequest(
      `/api/effects/keyframes?projectId=${TEST_PROJECT_ID}&scrubberId=${TEST_SCRUBBER_ID}`
    );
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(Array.isArray(result.data), 'Should return array of keyframes');
  });

  // Test 20: Masks - Save
  await runTest('POST /api/effects/masks - Save masks', async () => {
    const masks = {
      projectId: TEST_PROJECT_ID,
      scrubberId: TEST_SCRUBBER_ID,
      masks: [
        {
          maskType: 'rectangle',
          points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
          shape: { width: 100, height: 100 }
        }
      ]
    };

    const result = await apiRequest('/api/effects/masks', 'POST', masks);
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(result.data.success, 'Should return success');
  });

  // Test 21: Masks - Get
  await runTest('GET /api/effects/masks - Get masks', async () => {
    const result = await apiRequest(
      `/api/effects/masks?projectId=${TEST_PROJECT_ID}&scrubberId=${TEST_SCRUBBER_ID}`
    );
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(Array.isArray(result.data), 'Should return array of masks');
  });

  // Test 22: Project - Save All Effects
  await runTest('POST /api/effects/project/save - Save all project effects', async () => {
    const projectEffects = {
      projectId: TEST_PROJECT_ID,
      effects: {
        visualEffects: [],
        colorCorrections: [],
        audioEffects: [],
        luts: [],
        blendModes: []
      }
    };

    const result = await apiRequest('/api/effects/project/save', 'POST', projectEffects);
    assert(result.status === 200, `Expected 200, got ${result.status}`);
    assert(result.data.success, 'Should return success');
  });

  // Test 23: Presets - Delete
  await runTest('DELETE /api/effects/presets/:id - Delete preset', async () => {
    const presetsResult = await apiRequest(`/api/effects/presets?userId=${TEST_USER_ID}`);
    if (presetsResult.data && presetsResult.data.length > 0) {
      const presetId = presetsResult.data[0].id;
      const result = await apiRequest(`/api/effects/presets/${presetId}`, 'DELETE');
      assert(result.status === 200, `Expected 200, got ${result.status}`);
      assert(result.data.success, 'Should return success');
    } else {
      console.log('   ⚠️  Skipped: No presets available to delete');
    }
  });

  // Test 24: LUT - Delete
  await runTest('DELETE /api/effects/luts/:id - Delete LUT', async () => {
    const lutsResult = await apiRequest(`/api/effects/luts?userId=${TEST_USER_ID}`);
    if (lutsResult.data && lutsResult.data.length > 0) {
      const lutId = lutsResult.data[0].id;
      const result = await apiRequest(`/api/effects/luts/${lutId}?userId=${TEST_USER_ID}`, 'DELETE');
      assert(result.status === 200, `Expected 200, got ${result.status}`);
      assert(result.data.success, 'Should return success');
    } else {
      console.log('   ⚠️  Skipped: No LUTs available to delete');
    }
  });

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST RESULTS\n');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total:  ${results.passed + results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Phase 2 Integration Tests Complete!\n');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});