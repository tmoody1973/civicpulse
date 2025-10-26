'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, RefreshCw, Users, FileText, UserCheck, Mic, Newspaper, Vote } from 'lucide-react';

interface TableInfo {
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const TABLES: TableInfo[] = [
  {
    name: 'users',
    icon: <Users className="h-5 w-5" />,
    description: 'User profiles and preferences',
    color: 'bg-blue-500'
  },
  {
    name: 'bills',
    icon: <FileText className="h-5 w-5" />,
    description: 'Congressional legislation',
    color: 'bg-green-500'
  },
  {
    name: 'representatives',
    icon: <UserCheck className="h-5 w-5" />,
    description: 'Senators and House members',
    color: 'bg-purple-500'
  },
  {
    name: 'user_bills',
    icon: <Database className="h-5 w-5" />,
    description: 'User bill tracking',
    color: 'bg-yellow-500'
  },
  {
    name: 'podcasts',
    icon: <Mic className="h-5 w-5" />,
    description: 'Generated audio briefings',
    color: 'bg-red-500'
  },
  {
    name: 'rss_articles',
    icon: <Newspaper className="h-5 w-5" />,
    description: 'Cached news articles',
    color: 'bg-orange-500'
  },
  {
    name: 'vote_records',
    icon: <Vote className="h-5 w-5" />,
    description: 'Representative voting history',
    color: 'bg-indigo-500'
  }
];

export default function AdminDashboard() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch counts for all tables on mount
  useEffect(() => {
    fetchAllCounts();
  }, []);

  // Auto-refresh every 30 seconds if a table is selected
  useEffect(() => {
    if (!selectedTable) return;

    const interval = setInterval(() => {
      fetchTableData(selectedTable);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [selectedTable]);

  const fetchAllCounts = async () => {
    for (const table of TABLES) {
      try {
        const response = await fetch(`/api/admin/${table.name}/count`);
        if (response.ok) {
          const data = await response.json();
          setCounts(prev => ({ ...prev, [table.name]: data.count }));
        }
      } catch (error) {
        console.error(`Error fetching count for ${table.name}:`, error);
      }
    }
  };

  const fetchTableData = async (tableName: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/${tableName}`);
      if (response.ok) {
        const data = await response.json();
        setTableData(data.rows || []);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error(`Error fetching ${tableName}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    fetchTableData(tableName);
  };

  const handleRefresh = () => {
    if (selectedTable) {
      fetchTableData(selectedTable);
    }
    fetchAllCounts();
  };

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Civic Pulse Admin</h1>
                <p className="text-sm text-muted-foreground">Database Management Console</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </span>
              <Button onClick={handleRefresh} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Table List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Database Tables</CardTitle>
                <CardDescription>Select a table to view its data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {TABLES.map((table) => (
                  <button
                    key={table.name}
                    onClick={() => handleTableSelect(table.name)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedTable === table.name
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    }`}
                  >
                    <div className={`${table.color} text-white p-2 rounded-md`}>
                      {table.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{table.name}</div>
                      <div className={`text-xs ${
                        selectedTable === table.name
                          ? 'text-primary-foreground/80'
                          : 'text-muted-foreground'
                      }`}>
                        {table.description}
                      </div>
                    </div>
                    {counts[table.name] !== undefined && (
                      <Badge variant={selectedTable === table.name ? 'secondary' : 'outline'}>
                        {counts[table.name]}
                      </Badge>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Table Data */}
          <div className="lg:col-span-2">
            {!selectedTable ? (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Table Selected</h3>
                  <p className="text-muted-foreground">
                    Select a table from the sidebar to view its data
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="capitalize">{selectedTable}</CardTitle>
                      <CardDescription>
                        {tableData.length} {tableData.length === 1 ? 'record' : 'records'}
                      </CardDescription>
                    </div>
                    {loading && <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />}
                  </div>
                </CardHeader>
                <CardContent>
                  {tableData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No data in this table yet
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            {Object.keys(tableData[0]).map((key) => (
                              <th key={key} className="text-left p-2 font-medium">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.map((row, index) => (
                            <tr key={index} className="border-b hover:bg-muted/50">
                              {Object.entries(row).map(([key, value]) => (
                                <td key={key} className="p-2">
                                  {typeof value === 'string' && value.length > 50 ? (
                                    <span className="block truncate max-w-xs" title={value}>
                                      {value}
                                    </span>
                                  ) : (
                                    <span>{String(value ?? '')}</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
