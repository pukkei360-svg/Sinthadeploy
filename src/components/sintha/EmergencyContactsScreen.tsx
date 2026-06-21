'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, User, Phone, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const STORAGE_KEY = 'sintha_emergency_contacts'

interface EmergencyContact {
  id: string
  name: string
  phone: string
  relation: string
}

export default function EmergencyContactsScreen() {
  const { navigate } = useAppStore()
  const { toast } = useToast()
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newRelation, setNewRelation] = useState('')
  const [loaded, setLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const loadContacts = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          setContacts(JSON.parse(saved))
        }
      } catch {}
      setLoaded(true)
    }
    loadContacts()
  }, [])

  // Save to localStorage whenever contacts change
  const saveContacts = (updated: EmergencyContact[]) => {
    setContacts(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {}
  }

  const handleAdd = () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast({ title: 'Name and phone are required' })
      return
    }
    // Basic phone validation (Indian numbers: 10 digits or +91)
    const cleanPhone = newPhone.trim().replace(/[\s-]/g, '')
    if (!/^[\+]?[0-9]{10,13}$/.test(cleanPhone)) {
      toast({ title: 'Invalid phone number', description: 'Enter a valid 10-digit phone number' })
      return
    }

    if (contacts.length >= 3) {
      toast({ title: 'Maximum 3 contacts', description: 'Delete one to add another' })
      return
    }

    const newContact: EmergencyContact = {
      id: `ec_${Date.now()}`,
      name: newName.trim(),
      phone: cleanPhone,
      relation: newRelation.trim() || 'Contact',
    }

    saveContacts([...contacts, newContact])
    setNewName('')
    setNewPhone('')
    setNewRelation('')
    toast({ title: 'Emergency contact added!' })
  }

  const handleDelete = (id: string) => {
    saveContacts(contacts.filter((c) => c.id !== id))
    toast({ title: 'Contact removed' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate('sos')} className="text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Emergency Contacts</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            When you trigger SOS, these contacts will receive an SMS/WhatsApp alert with your location. Add up to 3 trusted people (family, friends, neighbors).
          </p>
        </div>

        {/* Existing contacts */}
        {loaded && contacts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Your Contacts ({contacts.length}/3)</p>
            {contacts.map((c) => (
              <div key={c.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.relation}</p>
                  <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" /> {c.phone}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new contact form (only if under 3) */}
        {loaded && contacts.length < 3 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-blue-600" /> Add Contact
            </p>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
              <Input
                placeholder="e.g. Mother, Brother, Friend"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={50}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Phone Number *</label>
              <Input
                type="tel"
                placeholder="e.g. 9876543210"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                maxLength={13}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Relation (optional)</label>
              <Input
                placeholder="e.g. Family, Neighbor, Friend"
                value={newRelation}
                onChange={(e) => setNewRelation(e.target.value)}
                maxLength={30}
              />
            </div>
            <Button
              className="w-full sintha-gradient text-white"
              onClick={handleAdd}
              disabled={!newName.trim() || !newPhone.trim()}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Contact
            </Button>
          </div>
        )}

        {/* Already has 3 contacts */}
        {loaded && contacts.length === 3 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <p className="text-sm text-green-700 font-medium">All 3 contacts set up!</p>
            <p className="text-xs text-green-600 mt-0.5">Delete one to add a different contact.</p>
          </div>
        )}

        {/* Privacy note */}
        <p className="text-[10px] text-center text-gray-400">
          Contacts are stored on your device only. SINTHA does not upload them to any server.
        </p>
      </div>
    </div>
  )
}
