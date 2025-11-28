'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Tag,
  Briefcase,
  Headphones,
  Settings,
  Megaphone,
  MoreHorizontal,
  Edit,
  Archive,
  Star,
  Filter,
  X,
  CheckSquare,
  Square,
  Layers
} from 'lucide-react';

/**
 * Group interface for assignment
 * @interface Group
 */
interface Group {
  _id: string;
  name: string;
  line_room_id: string;
  type: 'group' | 'individual';
  is_active: boolean;
  statistics: {
    total_sessions: number;
    total_messages: number;
    last_activity_at?: string;
  };
  assignment?: {
    category: 'sales' | 'support' | 'operations' | 'marketing' | 'other' | 'unassigned';
    tags: string[];
    custom_name?: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    notes?: string;
  };
  created_at: string;
}

/**
 * Category options
 */
const CATEGORIES = [
  { value: 'sales', label: 'Sales', icon: Briefcase, color: 'bg-blue-100 text-blue-800' },
  { value: 'support', label: 'Support', icon: Headphones, color: 'bg-green-100 text-green-800' },
  { value: 'operations', label: 'Operations', icon: Settings, color: 'bg-purple-100 text-purple-800' },
  { value: 'marketing', label: 'Marketing', icon: Megaphone, color: 'bg-orange-100 text-orange-800' },
  { value: 'other', label: 'Other', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-800' },
  { value: 'unassigned', label: 'Unassigned', icon: Tag, color: 'bg-yellow-100 text-yellow-800' },
];

/**
 * Priority options
 */
const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
];

/**
 * Group Assignment Page
 * @description Manage LINE group categorization and assignment with bulk operations
 */
export default function GroupAssignmentPage() {
  const { organization } = useAuth();
  const [groups, set_groups] = useState<Group[]>([]);
  const [loading, set_loading] = useState(true);
  const [processing, set_processing] = useState<string | null>(null);
  const [bulk_processing, set_bulk_processing] = useState(false);
  const [error_message, set_error_message] = useState<string | null>(null);
  const [success_message, set_success_message] = useState<string | null>(null);
  const [search_query, set_search_query] = useState('');
  const [category_filter, set_category_filter] = useState<string>('all');
  const [editing_group, set_editing_group] = useState<string | null>(null);
  const [edit_form, set_edit_form] = useState<{
    category: string;
    priority: string;
    custom_name: string;
    tags: string;
    notes: string;
  }>({
    category: 'unassigned',
    priority: 'normal',
    custom_name: '',
    tags: '',
    notes: ''
  });

  // Bulk selection state
  const [selected_groups, set_selected_groups] = useState<Set<string>>(new Set());
  const [bulk_category, set_bulk_category] = useState<string>('');
  const [bulk_priority, set_bulk_priority] = useState<string>('');

  useEffect(() => {
    if (organization?.id) {
      fetch_groups();
    }
  }, [organization?.id]);

  // Clear selection when filter changes
  useEffect(() => {
    set_selected_groups(new Set());
  }, [category_filter, search_query]);

  /**
   * Fetch groups
   * @description Calls groups.list tRPC endpoint (query = GET method)
   */
  const fetch_groups = async () => {
    try {
      set_loading(true);
      set_error_message(null);

      // Build input params for tRPC query
      const input: Record<string, any> = { limit: 100 };
      if (category_filter !== 'all') {
        input.category = category_filter;
      }

      // tRPC queries use GET with input as URL-encoded JSON in 'input' query param
      const query_params = new URLSearchParams({
        input: JSON.stringify(input)
      });

      const response = await fetch(`/api/trpc/groups.list?${query_params.toString()}`, {
        method: 'GET',
        headers: {
          'x-organization-id': organization?.id || ''
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.data?.groups) {
          set_groups(data.result.data.groups);
        }
      } else {
        set_error_message('Failed to load groups');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      set_error_message('Failed to load groups');
    } finally {
      set_loading(false);
    }
  };

  /**
   * Toggle group selection
   * @param group_id - Group ID to toggle
   */
  const toggle_selection = (group_id: string) => {
    const new_selection = new Set(selected_groups);
    if (new_selection.has(group_id)) {
      new_selection.delete(group_id);
    } else {
      new_selection.add(group_id);
    }
    set_selected_groups(new_selection);
  };

  /**
   * Select all filtered groups
   */
  const select_all = () => {
    if (selected_groups.size === filtered_groups.length) {
      set_selected_groups(new Set());
    } else {
      set_selected_groups(new Set(filtered_groups.map(g => g._id)));
    }
  };

  /**
   * Clear selection
   */
  const clear_selection = () => {
    set_selected_groups(new Set());
    set_bulk_category('');
    set_bulk_priority('');
  };

  /**
   * Bulk assign selected groups
   * @description Calls groups.bulkAssign tRPC endpoint
   */
  const bulk_assign = async () => {
    if (selected_groups.size === 0 || !bulk_category) {
      set_error_message('Please select groups and a category');
      return;
    }

    try {
      set_bulk_processing(true);
      set_error_message(null);

      const body: Record<string, any> = {
        roomIds: Array.from(selected_groups),
        category: bulk_category
      };

      if (bulk_priority) {
        body.priority = bulk_priority;
      }

      const response = await fetch('/api/trpc/groups.bulkAssign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization?.id || ''
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok && data.result?.data?.success) {
        set_success_message(`${data.result.data.updated} groups assigned to ${bulk_category}`);
        clear_selection();
        fetch_groups();
      } else {
        set_error_message(data.result?.data?.error || 'Failed to bulk assign groups');
      }
    } catch (error) {
      console.error('Bulk assign error:', error);
      set_error_message('Failed to bulk assign groups');
    } finally {
      set_bulk_processing(false);
    }
  };

  /**
   * Start editing a group
   * @param group - Group to edit
   */
  const start_editing = (group: Group) => {
    set_editing_group(group._id);
    set_edit_form({
      category: group.assignment?.category || 'unassigned',
      priority: group.assignment?.priority || 'normal',
      custom_name: group.assignment?.custom_name || '',
      tags: group.assignment?.tags?.join(', ') || '',
      notes: group.assignment?.notes || ''
    });
  };

  /**
   * Cancel editing
   */
  const cancel_editing = () => {
    set_editing_group(null);
    set_edit_form({
      category: 'unassigned',
      priority: 'normal',
      custom_name: '',
      tags: '',
      notes: ''
    });
  };

  /**
   * Save group assignment
   * @param group_id - Group ID to update
   */
  const save_assignment = async (group_id: string) => {
    try {
      set_processing(group_id);
      set_error_message(null);

      const tags = edit_form.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const response = await fetch('/api/trpc/groups.assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization?.id || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          roomId: group_id,
          category: edit_form.category,
          priority: edit_form.priority,
          custom_name: edit_form.custom_name || undefined,
          tags: tags.length > 0 ? tags : undefined,
          notes: edit_form.notes || undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.result?.data?.success) {
        set_success_message('Group assignment updated');
        cancel_editing();
        fetch_groups();
      } else {
        set_error_message(data.result?.data?.error || 'Failed to update assignment');
      }
    } catch (error) {
      console.error('Save error:', error);
      set_error_message('Failed to update assignment');
    } finally {
      set_processing(null);
    }
  };

  /**
   * Get category badge
   * @param category - Category value
   * @returns Badge component
   */
  const get_category_badge = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    if (!cat) return <Badge variant="outline">{category}</Badge>;
    const Icon = cat.icon;
    return (
      <Badge className={cat.color}>
        <Icon className="w-3 h-3 mr-1" />
        {cat.label}
      </Badge>
    );
  };

  /**
   * Get priority badge
   * @param priority - Priority value
   * @returns Badge component
   */
  const get_priority_badge = (priority: string) => {
    const pri = PRIORITIES.find(p => p.value === priority);
    if (!pri) return <Badge variant="outline">{priority}</Badge>;
    return <Badge className={pri.color}>{pri.label}</Badge>;
  };

  // Filter groups by search query
  const filtered_groups = groups.filter(group => {
    if (search_query === '') return true;
    const query = search_query.toLowerCase();
    const display_name = group.assignment?.custom_name || group.name;
    return (
      display_name.toLowerCase().includes(query) ||
      group.line_room_id.toLowerCase().includes(query) ||
      group.assignment?.tags?.some(t => t.toLowerCase().includes(query))
    );
  });

  // Stats by category
  const category_stats = CATEGORIES.map(cat => ({
    ...cat,
    count: groups.filter(g => (g.assignment?.category || 'unassigned') === cat.value).length
  }));

  const all_selected = filtered_groups.length > 0 && selected_groups.size === filtered_groups.length;
  const some_selected = selected_groups.size > 0;

  if (!organization) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Group Assignment</h1>
          <p className="text-gray-500 mt-1">Organize and categorize your LINE groups</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch_groups}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {category_stats.map((cat) => {
          const Icon = cat.icon;
          return (
            <Card
              key={cat.value}
              className={`p-3 cursor-pointer transition-all ${
                category_filter === cat.value ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => {
                set_category_filter(category_filter === cat.value ? 'all' : cat.value);
                set_loading(true);
                setTimeout(fetch_groups, 100);
              }}
            >
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${cat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{cat.count}</p>
                  <p className="text-xs text-gray-500">{cat.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Messages */}
      {success_message && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success_message}</AlertDescription>
        </Alert>
      )}

      {error_message && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error_message}</AlertDescription>
        </Alert>
      )}

      {/* Bulk Action Bar */}
      {some_selected && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {selected_groups.size} group{selected_groups.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <select
                  className="h-9 px-3 border rounded-md text-sm bg-white"
                  value={bulk_category}
                  onChange={(e) => set_bulk_category(e.target.value)}
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.filter(c => c.value !== 'unassigned').map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <select
                  className="h-9 px-3 border rounded-md text-sm bg-white"
                  value={bulk_priority}
                  onChange={(e) => set_bulk_priority(e.target.value)}
                >
                  <option value="">Priority (optional)</option>
                  {PRIORITIES.map(pri => (
                    <option key={pri.value} value={pri.value}>{pri.label}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={bulk_assign}
                  disabled={!bulk_category || bulk_processing}
                >
                  {bulk_processing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Assign Selected
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clear_selection}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, LINE ID, or tags..."
                value={search_query}
                onChange={(e) => set_search_query(e.target.value)}
                className="pl-9"
              />
            </div>
            {category_filter !== 'all' && (
              <Button
                variant="outline"
                onClick={() => {
                  set_category_filter('all');
                  fetch_groups();
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Groups List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              LINE Groups ({filtered_groups.length})
            </CardTitle>
            {filtered_groups.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={select_all}
                className="text-sm"
              >
                {all_selected ? (
                  <><CheckSquare className="w-4 h-4 mr-2" />Deselect All</>
                ) : (
                  <><Square className="w-4 h-4 mr-2" />Select All</>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filtered_groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No groups found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered_groups.map((group) => (
                <div
                  key={group._id}
                  className={`border rounded-lg overflow-hidden transition-all ${
                    selected_groups.has(group._id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                >
                  {/* Group Header */}
                  <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      {/* Checkbox */}
                      <button
                        className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
                        onClick={() => toggle_selection(group._id)}
                      >
                        {selected_groups.has(group._id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {group.assignment?.custom_name || group.name}
                          </h4>
                          {get_category_badge(group.assignment?.category || 'unassigned')}
                          {get_priority_badge(group.assignment?.priority || 'normal')}
                        </div>
                        <p className="text-sm text-gray-500">
                          {group.statistics.total_messages} messages • {group.statistics.total_sessions} sessions
                        </p>
                        {group.assignment?.tags && group.assignment.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {group.assignment.tags.map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editing_group === group._id ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancel_editing}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => start_editing(group)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Edit Form */}
                  {editing_group === group._id && (
                    <div className="p-4 bg-gray-50 border-t space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <select
                            className="w-full h-10 px-3 border rounded-md"
                            value={edit_form.category}
                            onChange={(e) => set_edit_form({ ...edit_form, category: e.target.value })}
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label>Priority</Label>
                          <select
                            className="w-full h-10 px-3 border rounded-md"
                            value={edit_form.priority}
                            onChange={(e) => set_edit_form({ ...edit_form, priority: e.target.value })}
                          >
                            {PRIORITIES.map(pri => (
                              <option key={pri.value} value={pri.value}>{pri.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label>Custom Display Name</Label>
                          <Input
                            placeholder="Override group name..."
                            value={edit_form.custom_name}
                            onChange={(e) => set_edit_form({ ...edit_form, custom_name: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Tags (comma separated)</Label>
                          <Input
                            placeholder="vip, important, etc..."
                            value={edit_form.tags}
                            onChange={(e) => set_edit_form({ ...edit_form, tags: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Notes</Label>
                          <Input
                            placeholder="Internal notes about this group..."
                            value={edit_form.notes}
                            onChange={(e) => set_edit_form({ ...edit_form, notes: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={cancel_editing}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => save_assignment(group._id)}
                          disabled={processing === group._id}
                        >
                          {processing === group._id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Save Assignment
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
