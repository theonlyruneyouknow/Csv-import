const express = require('express');
const router = express.Router();
const FamilyCircle = require('../models/FamilyCircle');
const { ensureAuthenticated } = require('../middleware/auth');
const crypto = require('crypto');

// Get all circles user is part of
router.get('/', async (req, res) => {
    try {
        const circles = await FamilyCircle.find({
            $or: [
                { createdBy: req.user._id },
                { 'members.user': req.user._id }
            ]
        }).populate('createdBy', 'firstName lastName')
          .populate('members.user', 'firstName lastName email');
        
        res.render('familycircles', {
            title: 'Family Circles - Greatest Joy',
            user: req.user,
            circles
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Create new circle
router.post('/', async (req, res) => {
    try {
        const { name, description, allowMemberInvites } = req.body;
        
        const circle = new FamilyCircle({
            name,
            description,
            createdBy: req.user._id,
            members: [{
                user: req.user._id,
                role: 'admin'
            }],
            settings: {
                allowMemberInvites: allowMemberInvites === 'true'
            }
        });
        
        await circle.save();
        res.redirect('/greatestjoy/familycircles');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// View circle details
router.get('/:id', async (req, res) => {
    try {
        const circle = await FamilyCircle.findById(req.params.id)
            .populate('createdBy', 'firstName lastName')
            .populate('members.user', 'firstName lastName email')
            .populate('invitations.invitedBy', 'firstName lastName');
        
        if (!circle) {
            return res.status(404).send('Circle not found');
        }
        
        // Check if user is a member
        const isMember = circle.members.some(m => m.user._id.toString() === req.user._id.toString());
        if (!isMember) {
            return res.status(403).send('Not authorized');
        }
        
        const isAdmin = circle.members.find(m => 
            m.user._id.toString() === req.user._id.toString() && m.role === 'admin'
        );
        
        res.render('familycircle-detail', {
            title: `${circle.name} - Greatest Joy`,
            user: req.user,
            circle,
            userRole: isAdmin ? 'admin' : 'member'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Invite someone to circle
router.post('/:id/invite', async (req, res) => {
    try {
        const circle = await FamilyCircle.findById(req.params.id);
        
        if (!circle) {
            return res.status(404).json({ error: 'Circle not found' });
        }
        
        const member = circle.members.find(m => m.user.toString() === req.user._id.toString());
        const isAdmin = member && member.role === 'admin';
        const canInvite = isAdmin || circle.settings.allowMemberInvites;
        
        if (!canInvite) {
            return res.status(403).json({ error: 'Not authorized to invite' });
        }
        
        const { email } = req.body;
        
        // Check if already invited
        const existingInvite = circle.invitations.find(
            inv => inv.email === email && inv.status === 'pending'
        );
        
        if (existingInvite) {
            return res.status(400).json({ error: 'Already invited' });
        }
        
        // Generate unique invite code
        const inviteCode = crypto.randomBytes(16).toString('hex');
        
        circle.invitations.push({
            email,
            invitedBy: req.user._id,
            inviteCode,
            status: 'pending'
        });
        
        await circle.save();
        
        // TODO: Send email with invite link
        // const inviteLink = `${req.protocol}://${req.get('host')}/greatestjoy/familycircles/join/${inviteCode}`;
        
        res.redirect(`/greatestjoy/familycircles/${circle._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Join circle with invite code
router.get('/join/:code', async (req, res) => {
    try {
        const circle = await FamilyCircle.findOne({
            'invitations.inviteCode': req.params.code,
            'invitations.status': 'pending'
        });
        
        if (!circle) {
            return res.render('join-circle', {
                error: 'Invalid or expired invitation',
                success: null,
                circle: null,
                inviteCode: null,
                invitedBy: null
            });
        }
        
        const invitation = circle.invitations.find(
            inv => inv.inviteCode === req.params.code
        );
        
        // Check if invitation expired
        if (new Date() > invitation.expiresAt) {
            invitation.status = 'expired';
            await circle.save();
            return res.render('join-circle', {
                error: 'Invitation expired',
                success: null,
                circle: null,
                inviteCode: null,
                invitedBy: null
            });
        }
        
        // Check if already a member
        const isMember = circle.members.some(m => 
            m.user.toString() === req.user._id.toString()
        );
        
        if (isMember) {
            return res.redirect(`/greatestjoy/familycircles/${circle._id}`);
        }
        
        res.render('join-circle', {
            circle,
            inviteCode: req.params.code,
            invitedBy: invitation.invitedBy,
            error: null,
            success: null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Accept invitation (POST)
router.post('/join/:code', async (req, res) => {
    try {
        const circle = await FamilyCircle.findOne({
            'invitations.inviteCode': req.params.code,
            'invitations.status': 'pending'
        });
        
        if (!circle) {
            return res.render('join-circle', {
                error: 'Invalid or expired invitation',
                success: null,
                circle: null,
                inviteCode: null,
                invitedBy: null
            });
        }
        
        const invitation = circle.invitations.find(
            inv => inv.inviteCode === req.params.code
        );
        
        // Check if invitation expired
        if (new Date() > invitation.expiresAt) {
            invitation.status = 'expired';
            await circle.save();
            return res.render('join-circle', {
                error: 'Invitation expired',
                success: null,
                circle: null,
                inviteCode: null,
                invitedBy: null
            });
        }
        
        // Add user to circle
        circle.members.push({
            user: req.user._id,
            role: 'member'
        });
        
        invitation.status = 'accepted';
        await circle.save();
        
        res.render('join-circle', {
            success: `Successfully joined ${circle.name}!`,
            error: null,
            circle: null,
            inviteCode: null,
            invitedBy: null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Remove member from circle
router.delete('/:id/members/:memberId', async (req, res) => {
    try {
        const circle = await FamilyCircle.findById(req.params.id);
        
        if (!circle) {
            return res.status(404).json({ error: 'Circle not found' });
        }
        
        const isAdmin = circle.members.some(m => 
            m.user.toString() === req.user._id.toString() && m.role === 'admin'
        );
        
        if (!isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        circle.members = circle.members.filter(
            m => m.user.toString() !== req.params.memberId
        );
        
        await circle.save();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
