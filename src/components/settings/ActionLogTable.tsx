
"use client";

import React, { useState } from 'react';
import { useAppState } from "@/contexts/AppStateContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { ListFilter, RotateCcw } from 'lucide-react';

const ITEMS_PER_PAGE = 15;

export default function ActionLogTable() {
  const { actionLog, logAction } = useAppState(); // Assuming logAction can be used to refresh or add a manual entry if needed
  const [currentPage, setCurrentPage] = useState(1);

  // Sort logs by timestamp descending
  const sortedLogs = React.useMemo(() => 
    [...actionLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), 
  [actionLog]);

  const totalPages = Math.ceil(sortedLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = sortedLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleRefresh = () => {
    // This is a bit of a conceptual refresh; real data would come from a server.
    // For local storage, re-fetching doesn't change much unless other tabs modified it.
    // We can log a manual refresh action.
    logAction("Manually Refreshed Action Log");
    setCurrentPage(1); // Reset to first page
  };


  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
            <CardTitle>Action Log</CardTitle>
            <CardDescription>A record of all significant activities within the application.</CardDescription>
        </div>
        <Button variant="outline" onClick={handleRefresh} size="sm">
            <RotateCcw className="mr-2 h-4 w-4" /> Refresh Log
        </Button>
      </CardHeader>
      <CardContent>
        {sortedLogs.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No actions logged yet.</p>
        ) : (
          <ScrollArea className="h-[500px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      <br />
                      <span className="text-xs">({new Date(log.timestamp).toLocaleString()})</span>
                    </TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.details ? <pre className="max-w-md whitespace-pre-wrap break-all">{JSON.stringify(log.details, null, 2)}</pre> : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
