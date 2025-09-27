import { NextApiRequest, NextApiResponse } from "next";
import { SelfAppDisclosureConfig } from "@selfxyz/common";
import {
  IConfigStorage,
  VerificationConfig,
  countryCodes,
  SelfBackendVerifier,
  AllIds,
} from "@selfxyz/core";
import { getUserOptions, initializeUserConfig } from "./sharedStorage";

export class InMemoryConfigStore implements IConfigStorage {
  async getActionId(userIdentifier: string, data: string): Promise<string> {
    return userIdentifier;
  }

  async setConfig(id: string, config: VerificationConfig): Promise<boolean> {
    // This method is not used in the current implementation
    return true;
  }

  async getConfig(id: string): Promise<VerificationConfig> {
    // Retrieve user options from shared storage
    let userOptions = getUserOptions(id);
    
    // Initialize default config if no user options found
    if (!userOptions) {
      console.log(`Initializing default config for user: ${id}`);
      userOptions = initializeUserConfig(id);
    }
    
    return userOptions as VerificationConfig;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const { attestationId, proof, publicSignals, userContextData } = req.body;

      if (!proof || !publicSignals || !attestationId || !userContextData) {
        return res.status(400).json({
          message:
            "Proof, publicSignals, attestationId and userContextData are required",
        });
      }

      const configStore = new InMemoryConfigStore();

      const AllowedIDs: Map<2 | 1 | 3, boolean> = new Map([
        [1, true],
        [2, true], 
        [3, true]
      ]);

      const selfBackendVerifier = new SelfBackendVerifier(
        "self-playground",
        "https://ae6ac07ce12d.ngrok-free.app/api/verify",
        true,
        AllowedIDs,
        configStore,
        "uuid",
      );
      console.log("selfBackendVerifier", selfBackendVerifier);

      const result = await selfBackendVerifier.verify(
        attestationId,
        proof,
        publicSignals,
        userContextData
      );

      if (!result.isValidDetails.isMinimumAgeValid) {
        return res.status(200).json({
          status: "error",
          result: false,
          reason: "Minimum age verification failed",
          details: result.isValidDetails,
        });
      }

      if (!result.isValidDetails.isOfacValid) {
        return res.status(200).json({
          status: "error",
          result: false,
          reason: "OFAC verification failed",
          details: result.isValidDetails,
        });
      }

      if (!result.isValidDetails.isValid) {
        return res.status(200).json({
          status: "error",
          result: false,
          reason: "Verification failed",
          details: result.isValidDetails,
        });
      }

      const saveOptions = (await configStore.getConfig(
        result.userData.userIdentifier
      )) as unknown as SelfAppDisclosureConfig;

      if (result.isValidDetails.isValid) {
        const filteredSubject = { ...result.discloseOutput };

        if (!saveOptions.issuing_state && filteredSubject) {
          filteredSubject.issuingState = "Not disclosed";
        }
        if (!saveOptions.name && filteredSubject) {
          filteredSubject.name = "Not disclosed";
        }
        if (!saveOptions.nationality && filteredSubject) {
          filteredSubject.nationality = "Not disclosed";
        }
        if (!saveOptions.date_of_birth && filteredSubject) {
          filteredSubject.dateOfBirth = "Not disclosed";
        }
        if (!saveOptions.passport_number && filteredSubject) {
          filteredSubject.idNumber = "Not disclosed";
        }
        if (!saveOptions.gender && filteredSubject) {
          filteredSubject.gender = "Not disclosed";
        }
        if (!saveOptions.expiry_date && filteredSubject) {
          filteredSubject.expiryDate = "Not disclosed";
        }

        res.status(200).json({
          status: "success",
          result: result.isValidDetails.isValid,
          credentialSubject: filteredSubject,
          verificationOptions: {
            minimumAge: saveOptions.minimumAge,
            ofac: saveOptions.ofac,
            excludedCountries: saveOptions.excludedCountries?.map(
              (countryName) => {
                const entry = Object.entries(countryCodes).find(
                  ([_, name]) => name === countryName
                );
                return entry ? entry[0] : countryName;
              }
            ),
          },
        });
      } else {
        res.status(200).json({
          status: "error",
          result: result.isValidDetails.isValid,
          reason: "Proof verification failed",
          details: result,
        });
      }
    } catch (error) {
      console.error("Error verifying proof:", error);
      return res.status(200).json({
        status: "error",
        result: false,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
