# automute
config.json
```json
{
    "network-interface": null,
    "profile": {
        "home": { // profile name
            "enter": "on", // unmute
            "exit": "off" // mute
        }
    },
    "wifi": {
        "some-ssid": "profile-name", // specify profile name
        "some-ssid2": { // or embed profile
            "enter": "on"
        }
    },
    "interval": 60000 // check interval in ms
}
```

- "network-interface": null
    - network interface
    - choose a random wifi interface if set to null or not set
- "profile"
    - key is profile name
    - action profile for wifi
    - "enter"(optional): "on" or "off"
        - executed when connected
        - "on": unmute
        - "off": mute
    - "exit"(optional): "on" or "off"
        - executed when disconnected
- "wifi"
    - key is ssid
    - value is profile name or action profile