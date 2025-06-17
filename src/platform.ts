import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from "homebridge";

import * as crypto from "crypto";
import { RinnaiBoilerAccessory } from "./platformAccessory.js";
import { PLATFORM_NAME, PLUGIN_NAME } from "./settings.js";

export class RinnaiBoilerPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly discoveredCacheUUIDs: string[] = [];

  public readonly baseURL: string;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig & RinnaiConfig,
    public readonly api: API
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.baseURL = "https://wifiboilers1.rinnai.co.kr:11443";

    this.log.debug("Finished initializing platform:", this.config.name);

    this.api.on("didFinishLaunching", () => {
      log.debug("Executed didFinishLaunching callback");

      void this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info("Loading accessory from cache:", accessory.displayName);

    this.accessories.set(accessory.UUID, accessory);
  }

  async discoverDevices() {
    const response = await fetch(new URL("/user", this.baseURL), {
      method: "POST",
      headers: { Accept: "application/json" },
      body: JSON.stringify({
        language: "KOR",
        deviceToken: this.config.deviceToken,
        query: "search",
        password: crypto
          .createHmac("sha1", "RinnaiSmartKey")
          .update(this.config.password)
          .digest("base64"),
        email: this.config.email,
        target: "id_login",
        deviceId: this.config.deviceId,
      }),
    });
    const json: {
      result: string;
      boilerData: Boiler[];
      userData: User[];
    } = await response.json();

    for (const device of json.boilerData) {
      const uuid = this.api.hap.uuid.generate(device.roomControlId);

      const existingAccessory = this.accessories.get(uuid) as
        | PlatformAccessory<Boiler>
        | undefined;

      if (existingAccessory) {
        this.log.info(
          "Restoring existing accessory from cache:",
          existingAccessory.displayName
        );

        new RinnaiBoilerAccessory(this, existingAccessory);
      } else {
        this.log.info("Adding new accessory:", device.boilerAlias);

        const accessory = new this.api.platformAccessory<Boiler>(
          device.boilerAlias,
          uuid
        );

        accessory.context = device;

        new RinnaiBoilerAccessory(this, accessory);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
          accessory,
        ]);
      }

      this.discoveredCacheUUIDs.push(uuid);
    }

    for (const [uuid, accessory] of this.accessories) {
      if (!this.discoveredCacheUUIDs.includes(uuid)) {
        this.log.info(
          "Removing existing accessory from cache:",
          accessory.displayName
        );
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
          accessory,
        ]);
      }
    }
  }
}
