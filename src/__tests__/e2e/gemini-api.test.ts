/**
 * End-to-End Tests for Gemini Live API Integration
 * Tests real API connectivity and response handling
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('Gemini Live API Integration', () => {
  const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  beforeAll(() => {
    if (!API_KEY || API_KEY === 'your_api_key_here') {
      console.warn('⚠️  Skipping E2E tests: No valid API key configured');
    }
  });

  describe('API Configuration', () => {
    it('should have valid API key format', () => {
      expect(API_KEY).toBeDefined();
      expect(API_KEY).toMatch(/^AIza[A-Za-z0-9_-]{35}$/);
    });

    it('should construct valid WebSocket URL', () => {
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidirectionalGenerateContent?key=${API_KEY}`;
      
      expect(url).toContain('wss://');
      expect(url).toContain('generativelanguage.googleapis.com');
      expect(url).toContain('BidirectionalGenerateContent');
      expect(url).toContain(`key=${API_KEY}`);
    });
  });

  describe('WebSocket Connection', () => {
    it.skipIf(!API_KEY || API_KEY === 'your_api_key_here')(
      'should establish WebSocket connection',
      async () => {
        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidirectionalGenerateContent?key=${API_KEY}`;
        
        const ws = new WebSocket(url);
        
        const connected = await new Promise((resolve) => {
          ws.onopen = () => resolve(true);
          ws.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 5000);
        });

        expect(connected).toBe(true);
        ws.close();
      },
      10000
    );

    it.skipIf(!API_KEY || API_KEY === 'your_api_key_here')(
      'should receive setupComplete after sending setup message',
      async () => {
        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidirectionalGenerateContent?key=${API_KEY}`;
        
        const ws = new WebSocket(url);
        
        const setupComplete = await new Promise((resolve) => {
          ws.onopen = () => {
            ws.send(JSON.stringify({
              setup: {
                model: 'models/gemini-2.0-flash-live-001',
              },
            }));
          };

          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.setupComplete) {
              resolve(true);
            }
          };

          ws.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 10000);
        });

        expect(setupComplete).toBe(true);
        ws.close();
      },
      15000
    );
  });

  describe('API Response Format', () => {
    it.skipIf(!API_KEY || API_KEY === 'your_api_key_here')(
      'should receive audio response for text input',
      async () => {
        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidirectionalGenerateContent?key=${API_KEY}`;
        
        const ws = new WebSocket(url);
        
        const audioReceived = await new Promise((resolve) => {
          let setupDone = false;

          ws.onopen = () => {
            ws.send(JSON.stringify({
              setup: {
                model: 'models/gemini-2.0-flash-live-001',
                generation_config: {
                  response_modalities: ['AUDIO'],
                },
              },
            }));
          };

          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.setupComplete && !setupDone) {
              setupDone = true;
              // Send a simple text message
              ws.send(JSON.stringify({
                clientContent: {
                  turns: [{ role: 'user', parts: [{ text: 'Hello' }] }],
                  turnComplete: true,
                },
              }));
            }

            if (data.serverContent) {
              const parts = data.serverContent.modelTurn?.parts;
              if (parts) {
                for (const part of parts) {
                  if (part.inlineData?.mimeType?.startsWith('audio/')) {
                    resolve(true);
                    return;
                  }
                }
              }
            }
          };

          ws.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 20000);
        });

        expect(audioReceived).toBe(true);
        ws.close();
      },
      25000
    );
  });

  describe('Tool Calling', () => {
    it.skipIf(!API_KEY || API_KEY === 'your_api_key_here')(
      'should support trigger_animation tool',
      async () => {
        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidirectionalGenerateContent?key=${API_KEY}`;
        
        const ws = new WebSocket(url);
        
        const toolSupported = await new Promise((resolve) => {
          ws.onopen = () => {
            ws.send(JSON.stringify({
              setup: {
                model: 'models/gemini-2.0-flash-live-001',
                tools: [
                  {
                    function_declarations: [
                      {
                        name: 'trigger_animation',
                        description: 'Triggers a 3D animation',
                        parameters: {
                          type: 'object',
                          properties: {
                            gesture_name: {
                              type: 'string',
                              enum: ['wave', 'nod'],
                            },
                          },
                        },
                      },
                    ],
                  },
                ],
              },
            }));
          };

          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.setupComplete) {
              resolve(true);
            }
          };

          ws.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 10000);
        });

        expect(toolSupported).toBe(true);
        ws.close();
      },
      15000
    );
  });
});
