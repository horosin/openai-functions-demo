document.addEventListener("DOMContentLoaded", function() {
  const apiKeyInput = document.querySelector('#apiKey');
  const messageInput = document.querySelector('#messageInput');
  const chatWindow = document.querySelector('#chatWindow');
  const sendBtn = document.querySelector('#sendBtn');

  const addMessageToChat = (role, content) => {
      chatWindow.innerHTML += `<div class="message"><strong>${role}:</strong> ${content}</div>`;
      chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  const callOpenAI = async (apiKey, messages) => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              "model": "gpt-3.5-turbo-0613",
              "messages": messages,
              "functions": [
                  {
                      "name": "get_current_weather",
                      "description": "Get the current weather in a given location",
                      "parameters": {
                          "type": "object",
                          "properties": {
                              "location": {
                                  "type": "string",
                                  "description": "The city and state, e.g. San Francisco, CA"
                              },
                              "unit": {
                                  "type": "string",
                                  "enum": ["celsius", "fahrenheit"]
                              }
                          },
                          "required": ["location"]
                      }
                  }
              ]
          })
      });

      return response.json();
  }

  const getWeather = async (location) => {
      const response = await fetch(`/api/weather?location=${location}`);
      return response.json();
  }

  const messages = [];

  sendBtn.addEventListener('click', async () => {
      const apiKey = apiKeyInput.value.trim();
      const message = messageInput.value.trim();

      if (!apiKey || !message) return;

      messages.push({role: 'user', content: message});
      addMessageToChat('user', message);
      messageInput.value = '';

      const response = await callOpenAI(apiKey, messages);

      if (response.choices[0].finish_reason === 'function_call') {
          const functionCall = response.choices[0].message.function_call;
          addMessageToChat('system', `Calling function ${functionCall.name} with arguments ${JSON.stringify(functionCall.arguments)}`);

          if (functionCall.name === 'get_current_weather') {
              const weather = await getWeather(JSON.parse(functionCall.arguments).location);
              messages.push({role: 'function', name: functionCall.name, content: JSON.stringify(weather)});
              addMessageToChat('system', `Function ${functionCall.name} returned: ${JSON.stringify(weather)}`);

              const newResponse = await callOpenAI(apiKey, messages);
              addMessageToChat('assistant', newResponse.choices[0].message.content);
          }
      } else {
          addMessageToChat('assistant', response.choices[0].message.content);
      }
  });

  messageInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
          sendBtn.click();
      }
  });
});
