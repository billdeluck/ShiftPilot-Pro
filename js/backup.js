// Ensure zip.js is loaded before this script
// <script src="https://gildas-lormeau.github.io/zip.js/demos/lib/zip.min.js"></script>

const BackupManager = {
    // --- Public API ---
    createAndDownloadBackup: async function(password) {
        try {
            const backupData = this._collectAllData();
            const zipBlob = await this._createEncryptedZip(backupData, password);
            this._triggerDownload(zipBlob);
            alert('Backup created and downloaded successfully!');
        } catch (error) {
            console.error('Error creating backup:', error);
            alert('Failed to create backup. Check console for details.');
        }
    },

    // Placeholder for Google Drive integration (Phase 3, Optional Sync)
    uploadBackupToGoogleDrive: async function(zipBlob) {
        alert('Google Drive integration is a future enhancement.');
        console.warn('Google Drive upload not implemented yet.');
        // This would involve OAuth 2.0 for Google API access
        // and then using the Google Drive API to upload the zipBlob.
    },

    // --- Internal Helper Functions ---
    _collectAllData: function() {
        // Collect all data from localStorage that ShiftPilot Pro uses
        const shifts = localStorage.getItem('shiftPilotPro_shifts') || '{}';
        const settings = localStorage.getItem('shiftPilotPro_settings') || '{}';
        // Add any other data stores here as they are implemented (e.g., user data, reports)

        return {
            'shifts.json': shifts,
            'settings.json': settings,
            // 'users.json': DataManager.getUsers() // Example for future
        };
    },

    _createEncryptedZip: async function(data, password) {
        if (!zip) {
            throw new Error("zip.js library not loaded. Please ensure <script src='https://gildas-lormeau.github.io/zip.js/demos/lib/zip.min.js'></script> is included.");
        }

        const zipWriter = new zip.ZipWriter(
            new zip.BlobWriter("application/zip"),
            {
                password: password,
                encryptionStrength: 3 // AES-256
            }
        );

        for (const filename in data) {
            await zipWriter.add(
                filename,
                new zip.TextReader(data[filename])
            );
        }

        return await zipWriter.close();
    },

    _triggerDownload: function(zipBlob) {
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        const date = new Date();
        const filename = `ShiftPilotPro_Backup_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.zip`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Clean up the object URL
    }
};