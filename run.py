#!/usr/bin/python

# Imports
####################################
import sys
import RPi.GPIO as GPIO
import time
import subprocess
import atexit


# Constants and Global Variables
####################################

# Resource Strings
READY_TEXT = "Ready to take photos! Press shutter to start."
POSE_TEXT = "Pose!"
SNAP_TEXT = "SNAP!"
PROCESSING_TEXT = "please wait while your photos print..."
FINISHED_PROCESSING_TEXT = "ready for next round"
ERROR_TEXT = "An unexpected error occurred"
QUITTING_TEXT = "Finished taking photos. Come again!"
GPIO_SETUP_TEXT = "Setting GPIO pins"
GPIO_CLEANUP_TEXT = "Cleaning Up GPIO"

# Subprocess Commands
GPPHOTO_COMMAND = "gphoto2 --capture-image-and-download" \
    + " --filename \"/home/pi/Pictures/Photobooth/%Y%m%d%H%M%S.jpg\""
PROCESSING_COMMAND = "sudo /home/pi/scripts/photobooth/assemble_and_print"

# GPIO Pins
SHUTTER_BUTTON = 24
SHUTTER_BUTTON_LED = 23
QUIT_BUTTON = 25
PROCESSING_LED = 22
POSING_LED = 18

# State Variables
takePhotos = True
cleanedUp = False


# Shared Functions
####################################

def setup_gpio():
    print GPIO_SETUP_TEXT

    GPIO.setmode(GPIO.BCM)
    GPIO.setup(SHUTTER_BUTTON, GPIO.IN)
    GPIO.setup(QUIT_BUTTON, GPIO.IN)
    GPIO.setup(POSING_LED, GPIO.OUT)
    GPIO.setup(SHUTTER_BUTTON_LED, GPIO.OUT)
    GPIO.setup(PROCESSING_LED, GPIO.OUT)
    GPIO.output(SHUTTER_BUTTON_LED, True)
    GPIO.output(PROCESSING_LED, False)


def cleanup_gpio():
    global cleanedUp

    print GPIO_CLEANUP_TEXT
    if(cleanedUp is False):
        cleanedUp = True
        GPIO.cleanup()


def take_photo():
    snap = 0

    while snap < 1:
        print(POSE_TEXT)
        GPIO.output(SHUTTER_BUTTON_LED, False)
        GPIO.output(POSING_LED, True)
        time.sleep(1.5)

        countdown = 5
        for i in range(4):
            print countdown
            GPIO.output(POSING_LED, False)
            time.sleep(0.5)
            GPIO.output(POSING_LED, True)
            time.sleep(0.5)
            countdown -= 1

        print countdown

        for i in range(5):
            GPIO.output(POSING_LED, False)
            time.sleep(0.1)
            GPIO.output(POSING_LED, True)
            time.sleep(0.1)
            GPIO.output(POSING_LED, False)

        print(SNAP_TEXT)
        gpout = subprocess.check_output(
            GPPHOTO_COMMAND,
            stderr=subprocess.STDOUT,
            shell=True)
        print(gpout)

        if "ERROR" not in gpout:
            snap += 1
            GPIO.output(POSING_LED, False)
            time.sleep(0.5)
            print(PROCESSING_TEXT)
            GPIO.output(PROCESSING_LED, True)
            # build image and send to printer
            # subprocess.call(PROCESSING_COMMAND, shell=True)
            # TODO: implement a reboot button
            # Wait to ensure that print queue doesn't pile up
            # TODO: check status of printer instead
            # of using this arbitrary wait time
            time.sleep(110)
            print(FINISHED_PROCESSING_TEXT)
            GPIO.output(PROCESSING_LED, False)
            GPIO.output(SHUTTER_BUTTON_LED, True)


def quit_application():
    global takePhotos

    print QUITTING_TEXT
    takePhotos = False
    cleanup_gpio()

# Main Application
####################################

# Register our cleanup process
atexit.register(cleanup_gpio)

# Configure the GPIO
setup_gpio()

print READY_TEXT
while (takePhotos is True):
    try:
        if (GPIO.input(SHUTTER_BUTTON)):
            take_photo()
        if(GPIO.input(QUIT_BUTTON)):
            quit_application()
    except:
        print ERROR_TEXT, sys.exc_info()[0]
        pass

print "Application End"
