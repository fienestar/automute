import * as wifi from 'node-wifi';
import * as fs from 'fs';
import * as loudness from 'loudness';

type ActionProfile = {
    "enter"?: "on" | "off",
    "exit"?: "on" | "off"
}

type ConfigJSON = {
    "network-interface"?: string | null,
    "profile"?: {
        [name: string]: ActionProfile
    },
    "wifi": {
        [ssid: string]: string | ActionProfile
    },
    "interval": number,
}

async function getConfig() {
    return await new Promise<ConfigJSON>(
        (resolve, reject) => fs.readFile('config.json', (err, data) => err !== null ? reject(err) : resolve(JSON.parse(data.toString())))
    );
}

function ssidOf(network: wifi.WiFiNetwork) {
    return network.ssid;
}

async function getCurrentWifiSsid()
{
    return await new Promise<string[]>(
        (resolve, reject) => {
            wifi.getCurrentConnections((err, networks) => {
                if(err !== null) {
                    reject(err);
                    return;
                }

                const filtered = networks.filter(
                    network => network.ssid !== ''
                )
                
                resolve(filtered.map(ssidOf))
            })
        }
    );
}

async function compareWifiSsidState(before: string[], after: string[])
{
    before = before.slice()
    before.sort()

    after = after.slice()
    after.sort()

    let i = 0, j = 0;
    const entereds: string[] = [];
    const exiteds: string[] = [];

    while(i < before.length && j < after.length) {
        if(before[i] === after[j]) {
            i++;
            j++;
        } else if(before[i] < after[j]) {
            exiteds.push(before[i]);
            i++;
        } else {
            entereds.push(after[j]);
            j++;
        }
    }

    while(i < before.length) {
        exiteds.push(before[i]);
        i++;
    }

    while(j < after.length) {
        entereds.push(after[j]);
        j++;
    }

    return {
        entereds,
        exiteds
    }
}

function getActionProfileOf(config: ConfigJSON, ssid: string): ActionProfile | null | undefined
{
    const value = config.wifi[ssid];

    if(value === undefined)
        return null;

    if(typeof value === 'string') {
        return config.profile?.[value];
    }else{
        return value
    }
}

function executeActionProfile(profile: ActionProfile, event: "enter" | "exit")
{
    if(profile[event] === 'on')
        loudness.setMuted(false);
    else if(profile[event] === 'off')
        loudness.setMuted(true);
}

async function main()
{
    const config = await getConfig();
    wifi.init({
        iface: config['network-interface']
    })

    let old = await getCurrentWifiSsid();
    setInterval(async () => {
        const current = await getCurrentWifiSsid();
        const { entereds, exiteds } = await compareWifiSsidState(old, current);
        old = current;

        const eventHandler = (event: "enter" | "exit", ssid: string) => {
            const profile = getActionProfileOf(config, ssid);
            if(profile === null) {
                console.log(`[INFO] ${ssid} is not configured. Skip.`);
                return;
            }

            if(profile === undefined) {
                console.error(`[ERROR] profile ${config.wifi?.[ssid]} for ${ssid} is not configured. Skip.`);
                return;
            }

            if(profile[event] !== undefined) {
                console.log(`[INFO] ${ssid} is ${event}ed. Turn ${profile[event]}.`);
                executeActionProfile(profile, event);
            }
        }

        entereds.forEach(eventHandler.bind(null, "enter"))
        exiteds.forEach(eventHandler.bind(null, "exit"))
    }, config.interval)
}

main().catch(console.error);
