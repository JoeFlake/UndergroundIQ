import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bluestakesService } from "@/lib/bluestakesService";
import { supabase } from "@/lib/supabaseClient";
import type { Ticket } from "@/types";

export const useTicketData = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("expires");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const placeFilter = searchParams.get('place');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        if (!user) {
          setTickets([]);
          setLoading(false);
          return;
        }
        // Fetch all tickets for the user from Blue Stakes API
        const ticketsData = await bluestakesService.getUserTicketsByMember(user.token);
        console.log("Tickets data from API:", ticketsData);
        setTickets(ticketsData);
        setProjects([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Filter and sort tickets based on current state
  const filteredAndSortedTickets = tickets
    .filter((ticket) => {
      // Only filter by active if showActiveOnly is true
      const activeMatch =
        !showActiveOnly || new Date(ticket.expires) > new Date();

      // Search filter
      const searchMatch =
        !searchQuery ||
        ticket.ticket?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.description &&
          ticket.description.toLowerCase().includes(searchQuery.toLowerCase()));

      // Place filter
      const placeMatch =
        !placeFilter ||
        (ticket.place && ticket.place.toLowerCase() === placeFilter.toLowerCase());

      return activeMatch && searchMatch && placeMatch;
    })
    .sort((a, b) => {
      if (sortBy === "expires") {
        const dateA = new Date(a.expires).getTime();
        const dateB = new Date(b.expires).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
      // Add more sorting options as needed
      return 0;
    });

  return {
    tickets: filteredAndSortedTickets,
    loading,
    error,
    showActiveOnly,
    setShowActiveOnly,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
  };
};
