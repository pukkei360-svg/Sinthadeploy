'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from './BottomNav'
import { ArrowLeft, MapPin, Plus, Trash2, Edit2, X, Home, Briefcase, MapPinned } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cleanError } from '@/lib/clean-error'

interface SavedAddress {
  id: string
  label: string
  address: string
  latitude?: number | null
  longitude?: number | null
  createdAt: string
}

const LABEL_ICONS: Record<string, typeof Home> = {
  home: Home,
  office: Briefcase,
  work: Briefcase,
  mom: MapPinned,
  dad: MapPinned,
  other: MapPin,
}

export default function SavedAddressesScreen() {
  const { navigate, user } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ label: '', address: '' })
  const [saving, setSaving] = useState(false)

  const loadAddresses = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await apiFetch(`/addresses?clientId=${user.id}`)
      setAddresses(data.addresses || [])
    } catch (err) {
      console.error('Failed to load addresses:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAddresses()
  }, [user])

  const handleSubmit = async () => {
    if (!user) return
    if (!form.label.trim() || !form.address.trim()) {
      toast({ title: 'Error', description: 'Label and address are required' })
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await apiFetch('/addresses', {
          method: 'PUT',
          body: JSON.stringify({ id: editingId, ...form }),
        })
        toast({ title: 'Updated', description: 'Address updated' })
      } else {
        await apiFetch('/addresses', {
          method: 'POST',
          body: JSON.stringify({ clientId: user.id, ...form }),
        })
        toast({ title: 'Saved', description: 'Address added' })
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ label: '', address: '' })
      loadAddresses()
    } catch (err: unknown) {
      toast({ title: 'Error', description: cleanError(err) })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiFetch('/addresses', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      })
      setAddresses(addresses.filter((a) => a.id !== id))
      toast({ title: 'Deleted', description: 'Address removed' })
    } catch (err: unknown) {
      toast({ title: 'Error', description: cleanError(err) })
    }
  }

  const startEdit = (addr: SavedAddress) => {
    setEditingId(addr.id)
    setForm({ label: addr.label, address: addr.address })
    setShowForm(true)
  }

  const startAdd = () => {
    setEditingId(null)
    setForm({ label: '', address: '' })
    setShowForm(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('profile')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Saved Addresses</h1>
        <div className="flex-1" />
        {!showForm && (
          <button onClick={startAdd} className="text-blue-600">
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">
                {editingId ? 'Edit address' : 'Add new address'}
              </h3>
              <button
                onClick={() => { setShowForm(false); setEditingId(null) }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <Label htmlFor="label" className="text-xs text-gray-600">Label</Label>
              <Input
                id="label"
                placeholder="e.g. Home, Office, Mom's house"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="mt-1"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Tip: use &quot;Home&quot; or &quot;Office&quot; for the right icon
              </p>
            </div>
            <div>
              <Label htmlFor="address" className="text-xs text-gray-600">Full address</Label>
              <Textarea
                id="address"
                placeholder="House no, street, area, landmark, city"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
            <Button
              className="w-full sintha-gradient text-white"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Saving...' : editingId ? 'Update address' : 'Save address'}
            </Button>
          </div>
        )}

        {/* List */}
        {loading ? (
          [...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : addresses.length === 0 && !showForm ? (
          <div className="text-center py-16">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No saved addresses yet</p>
            <p className="text-xs text-gray-300 mt-1 mb-4">
              Save your home, office, or other frequent addresses
            </p>
            <Button
              onClick={startAdd}
              className="sintha-gradient text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" /> Add address
            </Button>
          </div>
        ) : (
          addresses.map((addr) => {
            const LabelIcon = LABEL_ICONS[addr.label.toLowerCase()] || MapPin
            return (
              <div key={addr.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <LabelIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{addr.label}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{addr.address}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(addr)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      aria-label="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <BottomNav />
    </div>
  )
}
