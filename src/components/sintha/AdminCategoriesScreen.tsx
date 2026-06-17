'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type ServiceCategory } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Plus, Trash2, Edit, GripVertical, Tag } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function AdminCategoriesScreen() {
  const { navigate, categories, setCategories } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await apiFetch('/categories', { cacheTtl: 30 * 1000 })
        setCategories(data.categories || [])
      } catch {
        // Use store data
      } finally {
        setLoading(false)
      }
    }
    loadCategories()
  }, [setCategories])

  const createCategory = async () => {
    if (!newName.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const data = await apiFetch('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          icon: newIcon || undefined,
          description: newDesc || undefined,
          order: categories.length + 1,
        }),
      })
      setCategories([...categories, data.category])
      setNewName('')
      setNewIcon('')
      setNewDesc('')
      setShowForm(false)
      toast({ title: 'Created', description: 'Category created successfully' })
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return
    try {
      await apiFetch(`/categories/${id}`, { method: 'DELETE' })
      setCategories(categories.filter((c) => c.id !== id))
      toast({ title: 'Deleted', description: 'Category deleted' })
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('admin-dashboard')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Categories</h1>
        <div className="flex-1" />
        <Button size="sm" className="sintha-gradient text-white" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* New Category Form */}
        {showForm && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-gray-800">New Category</h3>
              <div className="space-y-2">
                <Label htmlFor="cat-name">Name</Label>
                <Input id="cat-name" placeholder="e.g., Healthcare" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-icon">Icon (lucide icon name)</Label>
                <Input id="cat-icon" placeholder="e.g., heart" value={newIcon} onChange={(e) => setNewIcon(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-desc">Description</Label>
                <Input id="cat-desc" placeholder="Category description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 sintha-gradient text-white" onClick={createCategory} disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Categories List */}
        {loading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : categories.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Tag className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            No categories yet
          </div>
        ) : (
          categories.map((cat: ServiceCategory) => (
            <Card key={cat.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 text-sm">{cat.name}</p>
                    {cat.isActive ? (
                      <Badge className="bg-green-100 text-green-700 text-[9px] border-0">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[9px]">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{cat.description || 'No description'}</p>
                  <p className="text-[10px] text-gray-400">{cat._count?.providers || 0} providers &bull; Order: {cat.order}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4 text-gray-400" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteCategory(cat.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
