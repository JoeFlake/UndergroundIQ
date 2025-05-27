import { supabase } from "./supabaseClient";

interface BlueStakesTicket {
  ticket: string;
  description: string;
  status: string;
  expires: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
}

const BASE_URL = "https://newtiny-api.bluestakes.org/api";

export const bluestakesService = {
  async getAllTickets(token: string) {
    try {
      const response = await fetch(
        `${BASE_URL}/tickets/summary`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tickets from Blue Stakes");
      }

      const responseData = await response.json();
      return Array.isArray(responseData) ? responseData : responseData.data || [];
    } catch (error) {
      console.error("Error fetching all tickets:", error);
      throw error;
    }
  },

  async getTicketsForProject(projectId: string) {
    try {
      // First, get the project addresses
      const { data: addresses, error: addressesError } = await supabase
        .from("project_addresses")
        .select("*")
        .eq("project_id", projectId);

      if (addressesError) throw addressesError;
      console.log("Fetched addresses for project", projectId, addresses);
      if (!addresses || addresses.length === 0) {
        // No addresses found for this project
        return [];
      }

      // Get the user's Blue Stakes credentials
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("bluestakes_username, bluestakes_password")
        .single();

      if (userError) throw userError;

      if (!user?.bluestakes_username || !user?.bluestakes_password) {
        throw new Error("Blue Stakes credentials not found");
      }

      // For each address, fetch tickets from Blue Stakes API via local proxy
      const allTickets: BlueStakesTicket[] = [];

      for (const address of addresses) {
        const response = await fetch(
          "http://localhost:3001/api/bluestakes/tickets",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: user.bluestakes_username,
              password: user.bluestakes_password,
              address: address.address,
              city: address.city,
              state: address.state,
              zip: address.zip,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch tickets from Blue Stakes proxy");
        }

        const tickets = await response.json();
        if (Array.isArray(tickets.data)) {
          allTickets.push(...tickets.data);
        } else {
          console.error("Expected array from Blue Stakes, got:", tickets);
        }
      }

      return allTickets;
    } catch (error) {
      console.error("Error fetching tickets:", error);
      throw error;
    }
  },
};
