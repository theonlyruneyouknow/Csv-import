// routes/household.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Household = require('../models/Household');
const User = require('../models/User');

// Middleware to check if user has a household
async function ensureHousehold(req, res, next) {
    try {
        if (!req.user.household) {
            return res.redirect('/household/setup?needsHousehold=true');
        }
        
        const household = await Household.findById(req.user.household)
            .populate('members.user', 'firstName lastName email');
        
        if (!household || !household.isActive) {
            return res.redirect('/household/setup?needsHousehold=true');
        }
        
        req.household = household;
        next();
    } catch (error) {
        console.error('Error in ensureHousehold middleware:', error);
        res.status(500).send('Error loading household');
    }
}

// Household setup page
router.get('/setup', async (req, res) => {
    try {
        // Check if user already has a household
        if (req.user.household) {
            const household = await Household.findById(req.user.household);
            if (household && household.isActive) {
                return res.redirect('/household/dashboard');
            }
        }
        
        res.render('household-setup', {
            user: req.user,
            needsHousehold: req.query.needsHousehold === 'true'
        });
    } catch (error) {
        console.error('Error loading household setup:', error);
        res.status(500).send('Error loading page');
    }
});

// Create new household
router.post('/create', async (req, res) => {
    try {
        const { name, description, type } = req.body;
        
        // Check if user already belongs to a household
        if (req.user.household) {
            return res.status(400).json({ 
                success: false, 
                error: 'You already belong to a household' 
            });
        }
        
        // Create household
        const household = new Household({
            name: name,
            description: description || '',
            type: type || 'family',
            createdBy: req.user._id,
            members: [{
                user: req.user._id,
                role: 'owner',
                canManageShopping: true,
                canManagePantry: true,
                canManageRecipes: true,
                canManageMealPlans: true,
                canInviteMembers: true
            }]
        });
        
        await household.save();
        
        // Update user's household reference
        await User.findByIdAndUpdate(req.user._id, { household: household._id });
        
        res.json({ 
            success: true, 
            householdId: household._id,
            redirect: '/food/dashboard'
        });
    } catch (error) {
        console.error('Error creating household:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Join household via invite code
router.post('/join', async (req, res) => {
    try {
        const { inviteCode } = req.body;
        
        // Check if user already belongs to a household
        if (req.user.household) {
            return res.status(400).json({ 
                success: false, 
                error: 'You already belong to a household. Please leave your current household first.' 
            });
        }
        
        // Find household with this invite code
        const household = await Household.findOne({
            'invitations.inviteCode': inviteCode,
            'invitations.status': 'pending',
            isActive: true
        });
        
        if (!household) {
            return res.status(404).json({ 
                success: false, 
                error: 'Invalid or expired invite code' 
            });
        }
        
        // Find the specific invitation
        const invitation = household.invitations.find(
            inv => inv.inviteCode === inviteCode && inv.status === 'pending'
        );
        
        if (!invitation) {
            return res.status(404).json({ 
                success: false, 
                error: 'Invitation not found' 
            });
        }
        
        // Check if invitation has expired
        if (invitation.expiresAt < new Date()) {
            invitation.status = 'expired';
            await household.save();
            return res.status(400).json({ 
                success: false, 
                error: 'This invitation has expired' 
            });
        }
        
        // Add user to household
        household.members.push({
            user: req.user._id,
            role: 'member',
            canManageShopping: true,
            canManagePantry: true,
            canManageRecipes: true,
            canManageMealPlans: true,
            canInviteMembers: false
        });
        
        // Update invitation status
        invitation.status = 'accepted';
        invitation.acceptedAt = new Date();
        
        await household.save();
        
        // Update user's household reference
        await User.findByIdAndUpdate(req.user._id, { household: household._id });
        
        res.json({ 
            success: true, 
            householdId: household._id,
            householdName: household.name,
            redirect: '/food/dashboard'
        });
    } catch (error) {
        console.error('Error joining household:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Household dashboard
router.get('/dashboard', ensureHousehold, async (req, res) => {
    try {
        res.render('household-dashboard', {
            user: req.user,
            household: req.household
        });
    } catch (error) {
        console.error('Error loading household dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
});

// Send invitation
router.post('/invite', ensureHousehold, async (req, res) => {
    try {
        const { email, message } = req.body;
        
        // Check if user has permission to invite
        if (!req.household.hasPermission(req.user._id, 'canInviteMembers')) {
            return res.status(403).json({ 
                success: false, 
                error: 'You do not have permission to invite members' 
            });
        }
        
        // Check if user is already a member
        const existingMember = req.household.members.find(
            m => m.user.email === email.toLowerCase()
        );
        
        if (existingMember) {
            return res.status(400).json({ 
                success: false, 
                error: 'This user is already a member' 
            });
        }
        
        // Generate unique invite code
        const inviteCode = crypto.randomBytes(16).toString('hex');
        
        // Add invitation
        req.household.invitations.push({
            email: email.toLowerCase(),
            inviteCode: inviteCode,
            sentBy: req.user._id,
            message: message || ''
        });
        
        await req.household.save();
        
        // TODO: Send email with invite code
        // For now, return the invite code
        
        res.json({ 
            success: true, 
            inviteCode: inviteCode,
            inviteLink: `${req.protocol}://${req.get('host')}/household/join?code=${inviteCode}`
        });
    } catch (error) {
        console.error('Error sending invitation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get household members
router.get('/members', ensureHousehold, async (req, res) => {
    try {
        const household = await Household.findById(req.user.household)
            .populate('members.user', 'firstName lastName email');
        
        res.json({ 
            success: true, 
            members: household.members,
            invitations: household.invitations
        });
    } catch (error) {
        console.error('Error getting members:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update member permissions
router.put('/members/:userId', ensureHousehold, async (req, res) => {
    try {
        // Only owners and admins can update permissions
        const userRole = req.household.getMemberRole(req.user._id);
        if (userRole !== 'owner' && userRole !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: 'You do not have permission to update member permissions' 
            });
        }
        
        const memberIndex = req.household.members.findIndex(
            m => m.user.toString() === req.params.userId
        );
        
        if (memberIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Member not found' 
            });
        }
        
        // Update permissions
        const { role, canManageShopping, canManagePantry, canManageRecipes, canManageMealPlans, canInviteMembers } = req.body;
        
        if (role) req.household.members[memberIndex].role = role;
        if (canManageShopping !== undefined) req.household.members[memberIndex].canManageShopping = canManageShopping;
        if (canManagePantry !== undefined) req.household.members[memberIndex].canManagePantry = canManagePantry;
        if (canManageRecipes !== undefined) req.household.members[memberIndex].canManageRecipes = canManageRecipes;
        if (canManageMealPlans !== undefined) req.household.members[memberIndex].canManageMealPlans = canManageMealPlans;
        if (canInviteMembers !== undefined) req.household.members[memberIndex].canInviteMembers = canInviteMembers;
        
        await req.household.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating member:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Leave household
router.post('/leave', ensureHousehold, async (req, res) => {
    try {
        // Check if user is the owner
        const userRole = req.household.getMemberRole(req.user._id);
        if (userRole === 'owner') {
            return res.status(400).json({ 
                success: false, 
                error: 'Owner cannot leave household. Please transfer ownership or delete the household.' 
            });
        }
        
        // Remove user from household members
        req.household.members = req.household.members.filter(
            m => m.user.toString() !== req.user._id.toString()
        );
        
        await req.household.save();
        
        // Remove household reference from user
        await User.findByIdAndUpdate(req.user._id, { household: null });
        
        res.json({ success: true, redirect: '/household/setup' });
    } catch (error) {
        console.error('Error leaving household:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
module.exports.ensureHousehold = ensureHousehold;
